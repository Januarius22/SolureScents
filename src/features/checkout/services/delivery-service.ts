import { findNigerianState } from "../constants/nigerian-states";
import type { DeliveryQuote } from "../types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Evaluates the delivery quote for a selected Nigerian state and cart subtotal.
 *
 * Architecture Principles (Sprint 2.1 Compliance):
 * 1. Explicitly categorizes delivery into three distinct states:
 *    - 'configured': Courier rate is confirmed in database records (feeMinor > 0).
 *    - 'pending': Courier rate is unconfirmed/unknown (feeMinor = null, isTotalSettled = false).
 *    - 'free': Order genuinely qualifies for verified complimentary shipping (feeMinor = 0).
 * 2. Never fabricates courier fees.
 * 3. Never represents an unknown delivery cost as ₦0 or free shipping.
 * 4. Transparently declares a product-only payment total when shipping is pending.
 */
export async function getDeliveryQuote(
  stateNameOrCode: string,
  subtotalMinor?: number,
): Promise<DeliveryQuote> {
  const state = findNigerianState(stateNameOrCode);

  if (!state) {
    return {
      state: stateNameOrCode,
      zone: "unknown",
      estimatedDays: "3 - 7 business days",
      status: "pending",
      feeMinor: null,
      currency: "NGN",
      isConfigured: false,
      notice: "Please select a valid Nigerian state to review delivery estimates.",
      breakdownLabel: "Pending State Selection",
    };
  }

  // Check if administrative shipping zones exist in Supabase
  try {
    const supabase = await createServerSupabaseClient();
    const { data: zones } = await supabase
      .from("shipping_zones")
      .select("id, name, state_regions, is_active")
      .eq("is_active", true);

    if (zones && zones.length > 0) {
      // Find zone covering this state
      const matchingZone = zones.find(
        (z) =>
          Array.isArray(z.state_regions) &&
          (z.state_regions.includes(state.name) || z.state_regions.includes(state.code)),
      );

      if (matchingZone) {
        const { data: zoneMethods } = await supabase
          .from("shipping_zone_methods")
          .select(`
            method_id,
            minimum_subtotal_minor,
            maximum_subtotal_minor,
            shipping_methods (
              id,
              name,
              price_minor,
              currency,
              estimated_days_min,
              estimated_days_max,
              is_active
            )
          `)
          .eq("zone_id", matchingZone.id);

        if (zoneMethods && zoneMethods.length > 0) {
          const zm = zoneMethods[0];
          const method = zm?.shipping_methods as unknown as {
            price_minor: number;
            currency: string;
            estimated_days_min: number;
            estimated_days_max: number;
            is_active: boolean;
          } | null;

          if (zm && method && method.is_active && method.price_minor >= 0) {
            // Check if order qualifies for genuine free shipping threshold
            const qualifiesForFree =
              zm.minimum_subtotal_minor !== null &&
              typeof subtotalMinor === "number" &&
              subtotalMinor >= zm.minimum_subtotal_minor &&
              method.price_minor === 0;

            if (qualifiesForFree || method.price_minor === 0) {
              return {
                state: state.name,
                zone: matchingZone.name,
                estimatedDays: `${method.estimated_days_min} - ${method.estimated_days_max} business days`,
                status: "free",
                feeMinor: 0,
                currency: "NGN",
                isConfigured: true,
                notice: `Complimentary courier delivery to ${state.name}.`,
                breakdownLabel: "Complimentary Delivery (Qualified Promotion)",
              };
            }

            return {
              state: state.name,
              zone: matchingZone.name,
              estimatedDays: `${method.estimated_days_min} - ${method.estimated_days_max} business days`,
              status: "configured",
              feeMinor: method.price_minor,
              currency: "NGN",
              isConfigured: true,
              notice: `Standard courier service to ${state.name}.`,
              breakdownLabel: "Standard Courier Delivery",
            };
          }
        }
      }
    }
  } catch {
    // If shipping zone tables are not yet queried or connection is unavailable,
    // gracefully fall back to the unconfigured transparent state.
  }

  // Default state: Honest pending-dispatch calculation notice
  return {
    state: state.name,
    zone: state.zone,
    estimatedDays: state.estimatedDays,
    status: "pending",
    feeMinor: null,
    currency: "NGN",
    isConfigured: false,
    notice: `Courier delivery to ${state.name} (${state.estimatedDays}). Courier dispatch fee calculated based on exact street address prior to dispatch.`,
    breakdownLabel: "Courier Fee Calculated at Dispatch",
  };
}
