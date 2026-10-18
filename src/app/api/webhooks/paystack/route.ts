import { NextRequest, NextResponse } from "next/server";
import { paystackGateway } from "@/features/payments/services/paystack-gateway";
import {
  finalizeSuccessfulPayment,
  finalizeFailedPayment,
} from "@/features/payments/services/payment-fulfillment";
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

/**
 * Paystack Webhook Handler (Sprint 3 — Test Mode Only).
 *
 * Security Requirements:
 * 1. Verifies HMAC-SHA512 signature using PAYSTACK_SECRET_KEY in constant time.
 * 2. Rejects unauthorized requests with 401 Unauthorized immediately.
 * 3. Enforces idempotency to handle repeated webhook events safely.
 * 4. Atomically transitions payment and order states.
 * 5. Safely deduplicates events and avoids double-decrementing inventory.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    // 1. Authenticate webhook sender using cryptographic signature
    const isValid = paystackGateway.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn("[PaystackWebhook] Rejected request with invalid HMAC-SHA512 signature.");
      return new NextResponse("Invalid signature", { status: 401 });
    }

    // 2. Parse event payload
    const event = JSON.parse(rawBody);
    const eventType = event.event as string;
    const data = event.data as Record<string, unknown>;

    if (!data || !eventType) {
      return NextResponse.json({ received: true, note: "Ignored empty payload" });
    }

    const reference = (data.reference as string) || (data.trxref as string);
    const amount = Number(data.amount);
    const currency = (data.currency as string) || "NGN";
    const status = data.status as string;

    // 3. Log event idempotency if payment_webhooks exists
    const dbClient = createPrivilegedSupabaseClient() ?? (await createServerSupabaseClient());
    try {
      const eventId = String(event.id || `${eventType}_${reference}_${Date.now()}`);
      await dbClient.from("payment_webhooks").insert({
        event_id: eventId,
        provider: "paystack",
        event_type: eventType,
        reference: reference || null,
        payload: event as unknown as Json,
        processed: true,
        processed_at: new Date().toISOString(),
      });
    } catch {
      // Table may be pending migration — continue gracefully
    }

    // 4. Process event types
    if (eventType === "charge.success") {
      if (status !== "success") {
        console.warn(`[PaystackWebhook] charge.success event has non-success status: ${status}`);
        return NextResponse.json({ received: true });
      }

      const result = await finalizeSuccessfulPayment({
        reference,
        amountMinor: amount,
        currency,
        gatewayResponse: data.gateway_response as string,
        channel: data.channel as string,
        customerEmail: (data.customer as { email?: string })?.email,
        metadata: data.metadata as Record<string, unknown>,
      });

      if (!result.success && result.requiresReconciliation) {
        console.error(
          `[PaystackWebhook] CRITICAL: Payment verified by Paystack, but atomic DB fulfillment failed for reference ${reference}. Returning HTTP 500 to trigger Paystack automated webhook retry:`,
          result.error,
        );
        return new NextResponse("Database fulfillment pending migration - reconciliation required", {
          status: 500,
        });
      }

      return NextResponse.json({
        received: true,
        fulfilled: result.success,
        alreadyProcessed: result.alreadyProcessed,
      });
    }

    if (eventType === "charge.failed") {
      await finalizeFailedPayment(
        reference,
        (data.gateway_response as string) || "charge_failed",
        (data.message as string) || "Transaction failed",
      );

      return NextResponse.json({ received: true, status: "failed_recorded" });
    }

    // Other events acknowledged safely
    return NextResponse.json({ received: true, unhandledEvent: eventType });
  } catch (err) {
    console.error("[PaystackWebhook] Uncaught error processing webhook:", err);
    // Return 500 so Paystack retries if an unexpected system exception occurs
    return new NextResponse("Webhook processing error", { status: 500 });
  }
}
