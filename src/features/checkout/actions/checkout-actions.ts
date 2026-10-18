"use server";

import { prepareGuestOrder } from "../services/order-preparation";
import { getDeliveryQuote } from "../services/delivery-service";
import type { GuestCheckoutInput } from "../validation/checkout-schema";
import type { DeliveryQuote } from "../types";

export interface CheckoutActionResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}

/**
 * Server Action: Calculates delivery fee quote for a chosen Nigerian state.
 */
export async function getDeliveryQuoteAction(
  stateName: string,
  subtotalMinor?: number,
): Promise<DeliveryQuote> {
  return await getDeliveryQuote(stateName, subtotalMinor);
}

/**
 * Server Action: Prepares a verified guest order on the server.
 * Authorization is secured via an HTTP-only confirmation session cookie,
 * ensuring capability tokens are never exposed in browser URLs.
 */
export async function submitGuestCheckoutAction(
  data: GuestCheckoutInput,
): Promise<CheckoutActionResult> {
  try {
    const result = await prepareGuestOrder(data);

    if (!result.success || !result.order) {
      return {
        success: false,
        error: result.error ?? "Failed to prepare order. Please review your information.",
      };
    }

    return {
      success: true,
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
    };
  } catch (err) {
    console.error("Unhandled error during guest checkout:", err);
    return {
      success: false,
      error: "An unexpected error occurred while preparing your order. Your bag is preserved. Please try again.",
    };
  }
}
