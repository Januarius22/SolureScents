import { getVerifiedGuestOrder } from "@/features/checkout/services/guest-order-access";
import { paystackGateway, PaystackConfigurationError } from "./paystack-gateway";
import { finalizeSuccessfulPayment, finalizeFailedPayment } from "./payment-fulfillment";
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export interface PaymentInitializationResult {
  success: boolean;
  redirectUrl?: string;
  providerReference?: string;
  error?: string;
  code?:
    | "UNAUTHORIZED"
    | "ORDER_NOT_FOUND"
    | "ALREADY_PAID"
    | "ORDER_CANCELLED"
    | "UNSETTLED_DELIVERY"
    | "GATEWAY_UNCONFIGURED"
    | "GATEWAY_ERROR";
}

export interface PaymentVerificationResult {
  success: boolean;
  status: "captured" | "failed" | "pending" | "reconciliation_required";
  orderId?: string;
  orderNumber?: string;
  amountMinor?: number;
  reference?: string;
  message?: string;
  requiresReconciliation?: boolean;
}

/**
 * High-Level Payment Service for Solure Scents (Sprint 3).
 */
export class PaymentService {
  /**
   * Initializes a Paystack test payment for an authorized customer order.
   */
  async initializePayment(
    orderId: string,
    origin?: string,
  ): Promise<PaymentInitializationResult> {
    // 1. Authorize: Verify customer guest session or token ownership
    const order = await getVerifiedGuestOrder(orderId);
    if (!order) {
      return {
        success: false,
        error: "Unauthorized access to order. Please review your order from your confirmed checkout session.",
        code: "UNAUTHORIZED",
      };
    }

    // 2. State Validations
    const orderStatus = order.status as string;
    if (["confirmed", "processing", "shipped", "delivered"].includes(orderStatus)) {
      return {
        success: false,
        error: "This order has already been paid and secured.",
        code: "ALREADY_PAID",
      };
    }

    if (orderStatus === "cancelled") {
      return {
        success: false,
        error: "This order has been cancelled and cannot be paid.",
        code: "ORDER_CANCELLED",
      };
    }

    if (order.totalMinor <= 0) {
      return {
        success: false,
        error: "Invalid order amount. Payment amount must be greater than zero.",
        code: "GATEWAY_ERROR",
      };
    }

    // 3. Currency Check
    if (order.currency.toUpperCase() !== "NGN") {
      return {
        success: false,
        error: `Unsupported payment currency: ${order.currency}. Solure Scents transactions are processed in NGN.`,
        code: "GATEWAY_ERROR",
      };
    }

    // 4. Test Gateway Configuration Check
    if (!paystackGateway.isConfigured()) {
      return {
        success: false,
        error: "Paystack test credentials (PAYSTACK_SECRET_KEY) are not configured. External payment processing is currently blocked.",
        code: "GATEWAY_UNCONFIGURED",
      };
    }

    // 5. Build dynamic return URL
    const baseUrl = origin?.replace(/\/+$/, "") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const returnUrl = `${baseUrl}/checkout/payment/callback?order_id=${order.id}`;

    // 6. Initiate with Paystack Gateway Adapter
    try {
      const initiation = await paystackGateway.initiate({
        amountMinor: order.totalMinor,
        currency: "NGN",
        customerEmail: order.customerEmail,
        idempotencyKey: order.id,
        orderId: order.id,
        returnUrl,
      });

      // 7. Persist Pending Payment Attempt in Database
      const dbClient = createPrivilegedSupabaseClient() ?? (await createServerSupabaseClient());
      try {
        await dbClient.rpc("initialize_order_payment", {
          p_order_id: order.id,
          p_provider: "paystack",
          p_provider_reference: initiation.providerReference,
          p_amount_minor: order.totalMinor,
          p_currency: "NGN",
          p_idempotency_key: `init_${initiation.providerReference}`,
          p_customer_email: order.customerEmail,
          p_metadata: {
            orderNumber: order.orderNumber,
            test_mode: true,
          } as unknown as Json,
        });
      } catch {
        // Fallback: direct insert if RPC pending migration
        try {
          await dbClient.from("payments").insert({
            order_id: order.id,
            provider: "paystack",
            provider_reference: initiation.providerReference,
            idempotency_key: `init_${initiation.providerReference}`,
            amount_minor: order.totalMinor,
            currency: "NGN",
            status: "pending",
            customer_email: order.customerEmail,
            metadata: {
              orderNumber: order.orderNumber,
              test_mode: true,
            } as unknown as Json,
          });
        } catch (dbErr) {
          console.warn("[PaymentService] Note on pending payment persistence:", dbErr);
        }
      }

      return {
        success: true,
        redirectUrl: initiation.redirectUrl,
        providerReference: initiation.providerReference,
      };
    } catch (err) {
      if (err instanceof PaystackConfigurationError) {
        return {
          success: false,
          error: err.message,
          code: "GATEWAY_UNCONFIGURED",
        };
      }

      console.error("[PaymentService] Initialization error:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unable to initialize payment gateway.",
        code: "GATEWAY_ERROR",
      };
    }
  }

  /**
   * Authoritatively verifies a Paystack payment by reference.
   * Performs real server-to-server inquiry against Paystack API.
   */
  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    if (!reference) {
      return {
        success: false,
        status: "failed",
        message: "No payment reference provided.",
      };
    }

    try {
      const verification = await paystackGateway.verifyTransaction(reference);

      if (verification.status === "success") {
        const result = await finalizeSuccessfulPayment({
          reference: verification.reference,
          amountMinor: verification.amountMinor,
          currency: verification.currency,
          gatewayResponse: verification.gatewayResponse,
          channel: verification.channel,
          customerEmail: verification.customerEmail,
          metadata: verification.metadata,
        });

        if (result.success) {
          return {
            success: true,
            status: "captured",
            orderId: result.orderId,
            orderNumber: result.orderNumber,
            amountMinor: verification.amountMinor,
            reference: verification.reference,
            message: "Payment successfully verified and order secured.",
          };
        } else {
          // STRICT RULE (Sprint 3.1): Never mark a verified successful charge as failed
          return {
            success: false,
            status: "reconciliation_required",
            requiresReconciliation: true,
            orderId: result.orderId,
            reference: verification.reference,
            amountMinor: verification.amountMinor,
            message:
              result.error ||
              "Your payment was confirmed by Paystack. Database order synchronization is being reconciled by store administration.",
          };
        }
      }

      if (verification.status === "failed" || verification.status === "abandoned") {
        await finalizeFailedPayment(
          verification.reference,
          verification.status,
          verification.gatewayResponse,
        );

        return {
          success: false,
          status: "failed",
          reference: verification.reference,
          message: `Payment was ${verification.status}: ${verification.gatewayResponse}`,
        };
      }

      return {
        success: false,
        status: "pending",
        reference: verification.reference,
        message: "Payment is still processing.",
      };
    } catch (err) {
      console.error("[PaymentService] Error verifying payment:", err);
      return {
        success: false,
        status: "failed",
        message: err instanceof Error ? err.message : "Failed to verify payment with Paystack.",
      };
    }
  }
}

export const paymentService = new PaymentService();
