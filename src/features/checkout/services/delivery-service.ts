import { findNigerianState } from "../constants/nigerian-states";
import type { DeliveryQuote } from "../types";

/**
 * Official delivery disclosure required by Solure Scents policy across all Nigerian states.
 */
export const ABUJA_DELIVERY_DISCLOSURE =
  "Your payment covers your perfume purchase only. Delivery fees, where applicable, will be confirmed separately by our team after your order is placed.";

/**
 * Evaluates the delivery quote for a selected Nigerian state and cart subtotal.
 *
 * Solure Scents — Abuja Delivery Policy:
 * 1. Primary business atelier: Abuja, FCT, Nigeria.
 * 2. Customers across ALL Nigerian states (Abuja, Lagos, Port Harcourt, Kano, etc.)
 *    are eligible to complete checkout without restriction.
 * 3. Customers pay for their perfume through Paystack; delivery charges are NOT included
 *    in the initial Paystack payment.
 * 4. Delivery arrangements happen via direct communication (WhatsApp) with Solure Scents.
 * 5. Delivery is NEVER labeled as FREE or ₦0.
 * 6. Explicit delivery status: 'arranged_separately'.
 */
export async function getDeliveryQuote(
  stateNameOrCode: string,
  _subtotalMinor?: number,
): Promise<DeliveryQuote> {
  void _subtotalMinor;
  const state = findNigerianState(stateNameOrCode);

  if (!state) {
    return {
      state: stateNameOrCode,
      zone: "unknown",
      estimatedDays: "2 - 5 business days",
      status: "arranged_separately",
      feeMinor: null,
      currency: "NGN",
      isConfigured: false,
      notice: "Please select a valid Nigerian state to review delivery estimates.",
      breakdownLabel: "Arranged Separately",
    };
  }

  const isAbuja = state.zone === "abuja" || state.name.toLowerCase().includes("abuja");
  const estimatedDays = isAbuja ? "1 - 2 business days (Abuja Atelier)" : state.estimatedDays;

  return {
    state: state.name,
    zone: state.zone,
    estimatedDays,
    status: "arranged_separately",
    feeMinor: null,
    currency: "NGN",
    isConfigured: true,
    notice: ABUJA_DELIVERY_DISCLOSURE,
    breakdownLabel: "Arranged Separately",
  };
}
