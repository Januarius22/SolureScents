"use server";

import { headers } from "next/headers";
import {
  paymentService,
  type PaymentInitializationResult,
  type PaymentVerificationResult,
} from "../services/payment-service";
import { clearPurchasedCartItems } from "@/features/cart/services/cart-service";
import {
  updateConfirmationPaymentStatus,
  getActiveConfirmationAuth,
} from "@/features/checkout/services/confirmation-session";
import { updatePreparedOrderPaymentStatus } from "@/features/checkout/services/order-preparation";
import { getVerifiedGuestOrder } from "@/features/checkout/services/guest-order-access";

/**
 * Server Action: Initiates Paystack test payment for an authorized customer order.
 */
export async function initializePaymentAction(
  orderId: string,
): Promise<PaymentInitializationResult> {
  try {
    const headersList = await headers();
    const origin =
      headersList.get("origin") ||
      headersList.get("referer") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    return await paymentService.initializePayment(orderId, origin);
  } catch (err) {
    console.error("Payment initialization Server Action exception:", err);
    return {
      success: false,
      error: "An unexpected error occurred while initiating your payment. Please try again.",
      code: "GATEWAY_ERROR",
    };
  }
}

/**
 * Server Action: Verifies a Paystack payment by reference upon returning from checkout.
 * Cleans up purchased cart items authoritatively if payment was captured successfully.
 * Synchronizes verified payment state into secure confirmation session cookies.
 */
export async function verifyPaymentAction(
  reference: string,
  clientOrderId?: string | null,
): Promise<PaymentVerificationResult> {
  try {
    const result = await paymentService.verifyPayment(reference);

    // Resolve authoritative order identity
    let targetOrderId = result.orderId || clientOrderId || null;
    let targetOrderNumber = result.orderNumber || null;

    if (!targetOrderId || !targetOrderNumber) {
      try {
        const auth = await getActiveConfirmationAuth(targetOrderId ?? undefined);
        if (auth) {
          targetOrderId = targetOrderId || auth.orderId;
          targetOrderNumber = targetOrderNumber || auth.orderNumber;
        }
      } catch (authErr) {
        console.warn("[verifyPaymentAction] Note on confirmation auth resolution:", authErr);
      }
    }

    if (!targetOrderNumber && targetOrderId) {
      try {
        const guestOrder = await getVerifiedGuestOrder(targetOrderId);
        if (guestOrder) {
          targetOrderNumber = guestOrder.orderNumber;
          if (!result.amountMinor && guestOrder.totalMinor) {
            result.amountMinor = guestOrder.totalMinor;
          }
        }
      } catch (orderErr) {
        console.warn("[verifyPaymentAction] Note on guest order resolution:", orderErr);
      }
    }

    // Paystack verified the payment: authoritative settlement confirmed from customer standpoint
    const isPaymentConfirmed = result.success || result.status === "reconciliation_required";

    if (isPaymentConfirmed) {
      const targetId = targetOrderId || targetOrderNumber;
      if (targetId) {
        try {
          await updateConfirmationPaymentStatus(targetId, {
            status: "captured",
            reference: result.reference || reference,
            amountMinor: result.amountMinor,
            paidAt: new Date().toISOString(),
          });
          await updatePreparedOrderPaymentStatus(targetId, "captured");
        } catch (sessionErr) {
          console.warn("[verifyPaymentAction] Note on confirmation session update:", sessionErr);
        }

        // Clean up cart items now that payment is confirmed
        if (result.success && result.orderId) {
          try {
            await clearPurchasedCartItems(result.orderId);
          } catch (cartErr) {
            console.warn("[verifyPaymentAction] Note on post-payment cart cleanup:", cartErr);
          }
        } else if (targetId) {
          try {
            await clearPurchasedCartItems(targetId);
          } catch (cartErr) {
            console.warn("[verifyPaymentAction] Note on post-payment cart cleanup:", cartErr);
          }
        }
      }

      return {
        success: true,
        status: "captured",
        orderId: targetOrderId ?? undefined,
        orderNumber: targetOrderNumber ?? "SOL-SCENTS",
        amountMinor: result.amountMinor,
        reference: result.reference || reference,
        message: "Payment successfully verified and order confirmed.",
      };
    }

    return result;
  } catch (err) {
    console.error("Payment verification Server Action exception:", err);
    return {
      success: false,
      status: "failed",
      message: "An unexpected error occurred while verifying your payment.",
    };
  }
}
