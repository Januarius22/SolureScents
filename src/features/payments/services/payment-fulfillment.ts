import { createPrivilegedSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export interface PaymentSuccessPayload {
  reference: string;
  amountMinor: number;
  currency: string;
  gatewayResponse?: string;
  channel?: string;
  customerEmail?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentFulfillmentResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  alreadyProcessed?: boolean;
  operationalStatus: "completed" | "already_processed" | "reconciliation_required" | "rejected";
  requiresReconciliation?: boolean;
  paymentReference?: string;
  amountMinor?: number;
  currency?: string;
  error?: string;
}

/**
 * Handles atomic finalization of a verified successful Paystack payment.
 *
 * Strict Architectural Guarantees (Sprint 3.1):
 * 1. ZERO NON-ATOMIC BYPASS: Removes all unsafe direct-table multi-query fallbacks.
 * 2. ATOMIC DATABASE TRANSACTION: Payment success is finalized exclusively through
 *    PostgreSQL stored procedure `finalize_paystack_successful_payment`.
 * 3. STRICT IDEMPOTENCY: Repeated webhook deliveries or callback returns for the same
 *    reference are safely deduplicated and cannot deduct stock twice or double-count revenue.
 * 4. FAIL-CLOSED INTEGRITY: If the required database RPC is missing or fails, the system
 *    fails closed without performing partial, unsynchronized database mutations.
 * 5. EVIDENCE PRESERVATION: Verified successful charges are NEVER marked as failed. If
 *    database recording cannot complete, the transaction is flagged for administrative reconciliation.
 */
export async function finalizeSuccessfulPayment(
  payload: PaymentSuccessPayload,
): Promise<PaymentFulfillmentResult> {
  const dbClient = createPrivilegedSupabaseClient();
  if (!dbClient) {
    console.error(
      "[PaymentFulfillment] FAIL-CLOSED: Privileged database credentials (SUPABASE_SERVICE_ROLE_KEY) are not configured on the server. Privileged payment finalization cannot proceed.",
    );
    return {
      success: false,
      operationalStatus: "reconciliation_required",
      requiresReconciliation: true,
      paymentReference: payload.reference,
      amountMinor: payload.amountMinor,
      currency: payload.currency,
      error:
        "Privileged server credentials (SUPABASE_SERVICE_ROLE_KEY) are not configured. Payment captured by Paystack; flagged for administrative reconciliation.",
    };
  }

  // 1. Strict Validation of Amount & Currency before touching database
  if (!Number.isInteger(payload.amountMinor) || payload.amountMinor <= 0) {
    return {
      success: false,
      operationalStatus: "rejected",
      error: `Invalid payment amount: ${payload.amountMinor}. Amount must be a positive integer in kobo.`,
    };
  }

  if (payload.currency?.toUpperCase() !== "NGN") {
    return {
      success: false,
      operationalStatus: "rejected",
      error: `Unsupported payment currency: ${payload.currency}. Solure Scents transactions support NGN only.`,
    };
  }

  if (!payload.reference || typeof payload.reference !== "string") {
    return {
      success: false,
      operationalStatus: "rejected",
      error: "Missing or invalid payment reference string.",
    };
  }

  // 2. Execute Atomic PostgreSQL RPC Transaction
  try {
    const { data: rpcPayment, error: rpcErr } = await dbClient.rpc(
      "finalize_paystack_successful_payment",
      {
        p_reference: payload.reference,
        p_amount_minor: payload.amountMinor,
        p_currency: payload.currency,
        p_gateway_response: payload.gatewayResponse ?? null,
        p_channel: payload.channel ?? null,
        p_metadata: (payload.metadata ?? {}) as unknown as Json,
      },
    );

    if (rpcErr) {
      // Database transaction error or missing RPC migration
      console.error("[PaymentFulfillment] CRITICAL: Atomic payment finalization RPC failed:", {
        reference: payload.reference,
        amountMinor: payload.amountMinor,
        code: rpcErr.code,
        message: rpcErr.message,
        hint: rpcErr.hint,
      });

      // FAIL CLOSED: Do NOT perform unsafe direct-table partial writes.
      // NEVER present verified payment as failed: Preserve evidence for admin reconciliation.
      return {
        success: false,
        operationalStatus: "reconciliation_required",
        requiresReconciliation: true,
        paymentReference: payload.reference,
        amountMinor: payload.amountMinor,
        currency: payload.currency,
        error: `Atomic payment fulfillment failed [${rpcErr.code ?? "RPC_ERROR"}]: ${rpcErr.message}. Payment was captured by Paystack; records flagged for reconciliation.`,
      };
    }

    if (!rpcPayment) {
      console.error("[PaymentFulfillment] CRITICAL: RPC returned empty record for reference:", payload.reference);
      return {
        success: false,
        operationalStatus: "reconciliation_required",
        requiresReconciliation: true,
        paymentReference: payload.reference,
        amountMinor: payload.amountMinor,
        currency: payload.currency,
        error: "Atomic payment RPC returned empty record. Flagged for administrative reconciliation.",
      };
    }

    // Strict Idempotency Check:
    // If captured_at is earlier than updated_at on a captured row, it was already processed previously
    const isAlreadyCaptured =
      rpcPayment.status === "captured" && rpcPayment.captured_at !== rpcPayment.updated_at;

    // Check if inventory reconciliation was flagged by the database stored procedure
    const requiresReconciliation =
      Boolean((rpcPayment as Record<string, unknown>).requires_reconciliation) ||
      Boolean((rpcPayment.metadata as Record<string, unknown> | null)?.requires_reconciliation);

    const reconciliationReason =
      (rpcPayment as Record<string, unknown>).reconciliation_reason ||
      (rpcPayment.metadata as Record<string, unknown> | null)?.reconciliation_reason;

    let orderNumber: string | undefined = (payload.metadata?.orderNumber as string) || undefined;
    if (!orderNumber && rpcPayment.order_id) {
      try {
        const { data: ord } = await dbClient
          .from("orders")
          .select("order_number")
          .eq("id", rpcPayment.order_id)
          .single();
        if (ord?.order_number) {
          orderNumber = ord.order_number;
        }
      } catch {
        // Continue without blocking
      }
    }

    return {
      success: true,
      orderId: rpcPayment.order_id,
      orderNumber,
      alreadyProcessed: isAlreadyCaptured,
      operationalStatus: requiresReconciliation
        ? "reconciliation_required"
        : isAlreadyCaptured
          ? "already_processed"
          : "completed",
      requiresReconciliation,
      paymentReference: payload.reference,
      amountMinor: payload.amountMinor,
      currency: payload.currency,
      error: requiresReconciliation
        ? String(reconciliationReason || "Inventory shortage or uninitialized level detected. Order flagged for administrative review.")
        : undefined,
    };
  } catch (ex) {
    console.error("[PaymentFulfillment] Unexpected system exception during atomic RPC execution:", ex);
    return {
      success: false,
      operationalStatus: "reconciliation_required",
      requiresReconciliation: true,
      paymentReference: payload.reference,
      amountMinor: payload.amountMinor,
      currency: payload.currency,
      error: `System exception during atomic payment fulfillment: ${ex instanceof Error ? ex.message : "Unknown error"}. Flagged for reconciliation.`,
    };
  }
}

/**
 * Handles atomic finalization of a failed or cancelled Paystack payment.
 */
export async function finalizeFailedPayment(
  reference: string,
  failureCode?: string,
  failureMessage?: string,
): Promise<{ success: boolean; orderId?: string }> {
  const dbClient = createPrivilegedSupabaseClient();
  if (!dbClient) {
    console.error(
      "[PaymentFulfillment] FAIL-CLOSED: SUPABASE_SERVICE_ROLE_KEY missing for failed payment recording.",
    );
    return { success: false };
  }

  try {
    const { data: rpcPayment, error: rpcErr } = await dbClient.rpc(
      "finalize_paystack_failed_payment",
      {
        p_reference: reference,
        p_failure_code: failureCode ?? null,
        p_failure_message: failureMessage ?? "Payment was not completed",
      },
    );

    if (rpcErr) {
      console.warn("[PaymentFulfillment] Note on finalizeFailedPayment RPC:", rpcErr.message);
      return { success: false };
    }

    return { success: true, orderId: rpcPayment?.order_id };
  } catch (err) {
    console.error("[PaymentFulfillment] Error in finalizeFailedPayment:", err);
    return { success: false };
  }
}
