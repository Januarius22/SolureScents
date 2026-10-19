"use server";

import { headers } from "next/headers";
import {
  paymentService,
  type PaymentInitializationResult,
  type PaymentVerificationResult,
} from "../services/payment-service";
import { clearPurchasedCartItems } from "@/features/cart/services/cart-service";

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
 */
export async function verifyPaymentAction(
  reference: string,
): Promise<PaymentVerificationResult> {
  try {
    const result = await paymentService.verifyPayment(reference);

    // Only clear purchased cart items if payment is authoritatively captured
    if (result.success && result.orderId) {
      try {
        await clearPurchasedCartItems(result.orderId);
      } catch (cartErr) {
        console.warn("[verifyPaymentAction] Note on post-payment cart cleanup:", cartErr);
      }
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
