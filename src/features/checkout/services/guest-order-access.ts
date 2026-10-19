import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createServerSupabaseClient, createPrivilegedSupabaseClient } from "@/lib/supabase/server";
import { getActiveConfirmationAuth } from "./confirmation-session";
import type { PreparedOrder, DeliveryPricingStatus } from "../types";

const PREPARED_ORDER_COOKIE = "solure_prepared_order_data";

/**
 * Retrieves a prepared guest order strictly verifying the capability token.
 *
 * Security Requirements (Sprint 2.1 Compliance):
 * 1. Token-free URL architecture: Authorization is verified via short-lived HTTP-only confirmation cookie.
 * 2. Compares token hashes using constant-time comparison to prevent timing attacks.
 * 3. Guest A cannot access Guest B's order even if they guess or modify the order ID.
 * 4. Anonymous callers without the active signed session cookie or valid token are rejected.
 */
export async function getVerifiedGuestOrder(
  orderId?: string | null,
  providedToken?: string | null,
): Promise<PreparedOrder | null> {
  // 1. Resolve authorization token hash from short-lived HTTP-only confirmation session cookie
  const authSession = await getActiveConfirmationAuth(orderId);
  const targetId = orderId || authSession?.orderId || authSession?.orderNumber;

  if (!targetId) {
    return null;
  }

  // Token hash to verify against: either from verified cookie session or hashed from explicitly provided token
  const expectedTokenHash =
    authSession?.tokenHash ??
    (providedToken ? createHash("sha256").update(providedToken).digest("hex") : null);

  if (!expectedTokenHash) {
    // Neither valid confirmation session cookie nor capability token was supplied
    return null;
  }

  // 2. Check if order is available in the secure server session cookie (offline/pending migration mode)
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(PREPARED_ORDER_COOKIE)?.value;

  if (sessionCookie) {
    try {
      const decodedJson = Buffer.from(sessionCookie, "base64url").toString("utf8");
      const parsed = JSON.parse(decodedJson) as {
        order: PreparedOrder;
        tokenHash: string;
      };

      if (parsed.order && (parsed.order.id === targetId || parsed.order.orderNumber === targetId)) {
        const expectedBuf = Buffer.from(parsed.tokenHash, "utf8");
        const providedBuf = Buffer.from(expectedTokenHash, "utf8");
        if (expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf)) {
          return parsed.order;
        }
      }
    } catch {
      // Invalid session cookie ignored
    }
  }

  // 3. Query live database verifying token hash
  const dbClient = createPrivilegedSupabaseClient() ?? (await createServerSupabaseClient());

  try {
    const { data: order, error } = await dbClient
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        fulfillment_status,
        currency,
        subtotal_minor,
        shipping_minor,
        discount_minor,
        tax_minor,
        total_minor,
        delivery_status,
        is_total_settled,
        customer_email,
        shipping_address,
        billing_address,
        customer_note,
        expires_at,
        created_at,
        guest_access_token_hash
      `)
      .or(`id.eq.${targetId},order_number.eq.${targetId}`)
      .single();

    if (error || !order || !order.guest_access_token_hash) {
      return null;
    }

    // Verify capability token hash using constant-time equality
    const dbHashBuf = Buffer.from(order.guest_access_token_hash, "utf8");
    const authHashBuf = Buffer.from(expectedTokenHash, "utf8");
    if (dbHashBuf.length !== authHashBuf.length || !timingSafeEqual(dbHashBuf, authHashBuf)) {
      return null;
    }

    // Fetch line items
    const { data: items } = await dbClient
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    const shipping = order.shipping_address as unknown as {
      recipientName?: string;
      phone?: string;
      email?: string;
      state?: string;
      cityOrLga?: string;
      streetAddress?: string;
      landmark?: string;
      deliveryInstructions?: string;
      deliveryNotice?: string;
      deliveryStatus?: DeliveryPricingStatus;
    };

    const rawDeliveryStatus = (order.delivery_status as DeliveryPricingStatus) ?? shipping.deliveryStatus ?? "arranged_separately";
    const deliveryStatus: DeliveryPricingStatus =
      rawDeliveryStatus === "arranged_separately" || shipping.deliveryStatus === "arranged_separately"
        ? "arranged_separately"
        : rawDeliveryStatus;

    const isPendingShipping = deliveryStatus === "pending";
    const isTotalSettled = deliveryStatus === "arranged_separately" ? true : (order.is_total_settled ?? !isPendingShipping);
    const shippingMinor = deliveryStatus === "arranged_separately" ? 0 : (isPendingShipping ? null : order.shipping_minor);

    return {
      id: order.id,
      orderNumber: order.order_number,
      status: (order.status as PreparedOrder["status"]) ?? "pending",
      fulfillmentStatus: order.fulfillment_status,
      currency: "NGN",
      deliveryStatus,
      subtotalMinor: order.subtotal_minor,
      shippingMinor,
      discountMinor: order.discount_minor,
      taxMinor: order.tax_minor,
      totalMinor: order.total_minor,
      isTotalSettled,
      customerEmail: order.customer_email,
      shippingAddress: {
        recipientName: shipping.recipientName ?? "Guest Customer",
        phone: shipping.phone ?? "",
        email: shipping.email ?? order.customer_email,
        state: shipping.state ?? "Nigeria",
        cityOrLga: shipping.cityOrLga ?? "",
        streetAddress: shipping.streetAddress ?? "",
        landmark: shipping.landmark,
        deliveryInstructions: shipping.deliveryInstructions,
        deliveryNotice: shipping.deliveryNotice ?? "",
        deliveryStatus,
      },
      billingAddress: (order.billing_address as Record<string, unknown>) ?? {},
      customerNote: order.customer_note,
      items: (items ?? []).map((i) => ({
        variantId: i.variant_id ?? "",
        productName: i.product_name,
        variantLabel: i.variant_label,
        sizeMl: 0,
        sku: i.sku,
        quantity: i.quantity,
        unitPriceMinor: i.unit_price_minor,
        lineTotalMinor: i.line_total_minor ?? i.unit_price_minor * i.quantity,
        currency: i.currency,
      })),
      expiresAt: order.expires_at ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      guestAccessToken: providedToken ?? "verified_session_auth",
      createdAt: order.created_at,
    };
  } catch {
    return null;
  }
}
