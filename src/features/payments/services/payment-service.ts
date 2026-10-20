import { getVerifiedGuestOrder } from "@/features/checkout/services/guest-order-access";
import { paystackGateway, PaystackConfigurationError } from "./paystack-gateway";
import { finalizeSuccessfulPayment, finalizeFailedPayment } from "./payment-fulfillment";
import { createPrivilegedSupabaseClient } from "@/lib/supabase/server";
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
    // 1. Privileged Credentials Check: Fail closed immediately if server lacks privileged access
    const dbClient = createPrivilegedSupabaseClient();
    if (!dbClient) {
      return {
        success: false,
        error: "Privileged database credentials (SUPABASE_SERVICE_ROLE_KEY) are required to verify and authorize payments. External payment initialization is blocked.",
        code: "GATEWAY_UNCONFIGURED",
      };
    }

    // 2. Authorize: Verify customer guest session or token ownership
    const order = await getVerifiedGuestOrder(orderId);
    if (!order) {
      return {
        success: false,
        error: "Unauthorized access to order. Please review your order from your confirmed checkout session.",
        code: "UNAUTHORIZED",
      };
    }

    // 3. Database Order Existence Check: Cookie-only checkouts cannot accept payment
    const { data: dbOrder, error: orderError } = await dbClient
      .from("orders")
      .select("id, order_number, status, total_minor, currency, expires_at, customer_email, is_total_settled")
      .or(`id.eq.${order.id},order_number.eq.${order.orderNumber}`)
      .single();

    if (orderError || !dbOrder) {
      return {
        success: false,
        error: "A real database order record is required to initialize payment. A cookie-only checkout session is not authorized to accept payment. Please complete checkout.",
        code: "ORDER_NOT_FOUND",
      };
    }

    // 4. Order State & Settlement Validations
    const orderStatus = dbOrder.status as string;
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

    if (!dbOrder.is_total_settled) {
      return {
        success: false,
        error: "Order total is not settled and cannot initiate payment.",
        code: "UNSETTLED_DELIVERY",
      };
    }

    if (dbOrder.total_minor <= 0) {
      return {
        success: false,
        error: "Invalid order amount. Payment amount must be greater than zero.",
        code: "GATEWAY_ERROR",
      };
    }

    // 5. Currency Check
    if (dbOrder.currency.toUpperCase() !== "NGN") {
      return {
        success: false,
        error: `Unsupported payment currency: ${dbOrder.currency}. Solure Scents transactions are processed in NGN.`,
        code: "GATEWAY_ERROR",
      };
    }

    // 6. Persisted Order Items Check
    const { data: dbItems, error: itemsError } = await dbClient
      .from("order_items")
      .select("id, variant_id, quantity, unit_price_minor, line_total_minor")
      .eq("order_id", dbOrder.id);

    if (itemsError || !dbItems || dbItems.length === 0) {
      return {
        success: false,
        error: "Order items have not been persisted in database. Payment cannot be initiated.",
        code: "GATEWAY_ERROR",
      };
    }

    // 7. Server Validation of Prices and Item Totals
    let calculatedItemsTotalMinor = 0;
    for (const item of dbItems) {
      if (item.quantity <= 0 || item.unit_price_minor <= 0) {
        return {
          success: false,
          error: "Invalid item quantity or price found in persisted order items.",
          code: "GATEWAY_ERROR",
        };
      }
      calculatedItemsTotalMinor += (item.line_total_minor ?? (item.quantity * item.unit_price_minor));
    }

    if (calculatedItemsTotalMinor !== dbOrder.total_minor) {
      return {
        success: false,
        error: `Persisted order item total (${calculatedItemsTotalMinor}) does not match order payable total (${dbOrder.total_minor}).`,
        code: "GATEWAY_ERROR",
      };
    }

    // 8. Inventory Reservation & Expiration Check
    const now = new Date();
    if (dbOrder.expires_at && new Date(dbOrder.expires_at) <= now) {
      return {
        success: false,
        error: "Order checkout window has expired. Please restart checkout to reserve fresh inventory.",
        code: "GATEWAY_ERROR",
      };
    }

    const { data: activeReservations, error: resError } = await dbClient
      .from("inventory_reservations")
      .select("id, status, expires_at")
      .eq("order_id", dbOrder.id);

    if (!resError && activeReservations && activeReservations.length > 0) {
      const hasValidReservation = activeReservations.some(
        (r) => r.status === "active" && new Date(r.expires_at) > now,
      );
      if (!hasValidReservation) {
        return {
          success: false,
          error: "Active inventory reservation has expired. Please restart checkout.",
          code: "GATEWAY_ERROR",
        };
      }
    }

    // 9. Gateway Configuration Check
    if (!paystackGateway.isConfigured()) {
      return {
        success: false,
        error: "Paystack test credentials (PAYSTACK_SECRET_KEY) are not configured. External payment processing is currently blocked.",
        code: "GATEWAY_UNCONFIGURED",
      };
    }

    // 10. Build dynamic return URL
    const baseUrl = origin?.replace(/\/+$/, "") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const returnUrl = `${baseUrl}/checkout/payment/callback?order_id=${dbOrder.id}`;

    // 11. Initiate with Paystack Gateway Adapter
    try {
      const initiation = await paystackGateway.initiate({
        amountMinor: dbOrder.total_minor,
        currency: "NGN",
        customerEmail: dbOrder.customer_email,
        idempotencyKey: dbOrder.id,
        orderId: dbOrder.id,
        returnUrl,
      });

      // 12. Persist Pending Payment Attempt in Database (Fail-Closed)
      let persistSuccess = false;

      const { error: rpcErr } = await dbClient.rpc("initialize_order_payment", {
        p_order_id: dbOrder.id,
        p_provider: "paystack",
        p_provider_reference: initiation.providerReference,
        p_amount_minor: dbOrder.total_minor,
        p_currency: "NGN",
        p_idempotency_key: `init_${initiation.providerReference}`,
        p_customer_email: dbOrder.customer_email,
        p_metadata: {
          orderNumber: dbOrder.order_number,
          test_mode: true,
        } as unknown as Json,
      });

      if (!rpcErr) {
        persistSuccess = true;
      } else {
        const { error: insertErr } = await dbClient.from("payments").insert({
          order_id: dbOrder.id,
          provider: "paystack",
          provider_reference: initiation.providerReference,
          idempotency_key: `init_${initiation.providerReference}`,
          amount_minor: dbOrder.total_minor,
          currency: "NGN",
          status: "pending",
          customer_email: dbOrder.customer_email,
          metadata: {
            orderNumber: dbOrder.order_number,
            test_mode: true,
          } as unknown as Json,
        });

        if (!insertErr) {
          persistSuccess = true;
        } else {
          console.error("[PaymentService] Failed to persist payment reference:", insertErr);
        }
      }

      if (!persistSuccess) {
        return {
          success: false,
          error: "Failed to securely record payment transaction in database. Payment processing halted.",
          code: "GATEWAY_ERROR",
        };
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
