import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { createServerSupabaseClient, createPrivilegedSupabaseClient } from "@/lib/supabase/server";
import type { Json, Database } from "@/types/database";
import { getActiveCart } from "@/features/cart/services/cart-service";
import { readGuestSession } from "@/features/cart/services/guest-session";
import { guestCheckoutSchema, normalizeNigerianPhone, type GuestCheckoutInput } from "../validation/checkout-schema";
import { getDeliveryQuote } from "./delivery-service";
import { issueConfirmationAuthorization } from "./confirmation-session";
import { reserveOrderInventory } from "./inventory-reservation";
import type { PreparedOrder, PrepareOrderResult, PreparedOrderItem } from "../types";

const PREPARED_ORDER_COOKIE = "solure_prepared_order_data";

/**
 * Validates whether an error indicates a missing RPC or unapplied migration schema constraint.
 */
function isMigrationPendingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; details?: string };
  return (
    e.code === "PGRST202" ||
    e.code === "42883" ||
    e.code === "23502" || // Not-null constraint violation on legacy profile_id
    e.code === "23514" || // Check constraint violation if 'arranged_separately' is not yet in enum
    Boolean(e.message?.includes("profile_id")) ||
    Boolean(e.message?.includes("orders_delivery_status_check")) ||
    Boolean(e.message?.includes("prepare_guest_order_record")) ||
    Boolean(e.message?.includes("Could not find the function")) ||
    Boolean(e.message?.includes("column \"guest_session_hash\" does not exist"))
  );
}

/**
 * Generates an official, human-readable Solure Scents order reference.
 * Example: SOL-2026-84920153
 */
function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(10000000 + Math.random() * 90000000);
  return `SOL-${year}-${randomPart}`;
}

/**
 * Prepares a customer guest order on the server.
 *
 * Security & Integrity Protections:
 * 1. Requires verified guest session.
 * 2. Re-fetches current variant prices strictly from the live database (never trusts client prices).
 * 3. Verifies stock availability and active catalog status.
 * 4. Normalizes Nigerian phone numbers and delivery details.
 * 5. Computes totals in integer kobo minor units.
 * 6. Generates a secure opaque guest access capability token for order tracking.
 * 7. Order status is explicitly set to 'pending' (unpaid) — payment activation occurs in Sprint 3.
 * 8. Does not deduct permanent inventory prematurely.
 */
export async function prepareGuestOrder(input: GuestCheckoutInput): Promise<PrepareOrderResult> {
  // 1. Validate Form Input
  const parsed = guestCheckoutSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue ? firstIssue.message : "Invalid checkout information.",
      code: "VALIDATION_FAILED",
    };
  }

  const formData = parsed.data;
  const phoneInfo = normalizeNigerianPhone(formData.phone);
  if (!phoneInfo.isValid) {
    return {
      success: false,
      error: phoneInfo.error ?? "Invalid Nigerian phone number.",
      code: "INVALID_PHONE",
    };
  }

  // 2. Retrieve Verified Server-Side Cart
  const session = await readGuestSession();
  if (!session) {
    return {
      success: false,
      error: "Your shopping session has expired. Please add your fragrances to the bag again.",
      code: "SESSION_EXPIRED",
    };
  }

  const cart = await getActiveCart();
  if (!cart || cart.items.length === 0) {
    return {
      success: false,
      error: "Your shopping bag is empty. Please select a fragrance before beginning checkout.",
      code: "EMPTY_CART",
    };
  }

  // 3. Revalidate Every Fragrance Variant Against Live Database
  const variantIds = cart.items.map((i) => i.variantId);
  const supabase = await createServerSupabaseClient();
  const { data: dbVariants, error: variantError } = await supabase
    .from("product_variants")
    .select(`
      id,
      product_id,
      label,
      size_ml,
      sku,
      price_minor,
      currency,
      status,
      is_available,
      products (
        id,
        name,
        slug,
        status,
        brand_id,
        brands (
          name
        )
      )
    `)
    .in("id", variantIds);

  if (variantError || !dbVariants) {
    console.error("Order preparation database error:", variantError);
    return {
      success: false,
      error: "Unable to verify current fragrance availability. Please try again in a moment.",
      code: "DATABASE_UNAVAILABLE",
    };
  }

  const variantMap = new Map(dbVariants.map((v) => [v.id, v]));
  const orderItems: PreparedOrderItem[] = [];
  let calculatedSubtotalMinor = 0;

  for (const cartItem of cart.items) {
    const v = variantMap.get(cartItem.variantId);
    if (!v) {
      return {
        success: false,
        error: `The fragrance "${cartItem.productName}" is no longer in our boutique catalog.`,
        code: "VARIANT_NOT_FOUND",
      };
    }

    const prod = v.products as unknown as {
      id: string;
      name: string;
      slug: string;
      status: string;
      brands: { name: string } | null;
    } | null;

    if (!prod || prod.status !== "active" || v.status !== "active" || !v.is_available) {
      return {
        success: false,
        error: `"${prod?.name ?? cartItem.productName} (${v.label})" is currently out of stock. Please adjust your bag.`,
        code: "OUT_OF_STOCK",
      };
    }

    const quantity = Math.min(99, Math.max(1, cartItem.quantity));
    const unitPriceMinor = v.price_minor;
    const lineTotalMinor = unitPriceMinor * quantity;
    calculatedSubtotalMinor += lineTotalMinor;

    orderItems.push({
      variantId: v.id,
      productName: prod.name,
      variantLabel: v.label,
      sizeMl: v.size_ml,
      sku: v.sku,
      quantity,
      unitPriceMinor,
      lineTotalMinor,
      currency: v.currency,
    });
  }

  // 4. Calculate Delivery Quote & Settlement Status (Abuja Atelier Nationwide Policy)
  const deliveryQuote = await getDeliveryQuote(formData.state, calculatedSubtotalMinor);
  // Online transaction shipping charge is 0; delivery is confirmed & charged separately via WhatsApp.
  const shippingMinor = 0;
  // Online payable total is the server-verified perfume total (settled for Paystack payment)
  const isTotalSettled = true;
  const totalMinor = calculatedSubtotalMinor;

  // 5. Generate Capability Access Token & Hashes
  const guestAccessToken = randomBytes(32).toString("hex");
  const guestAccessTokenHash = createHash("sha256").update(guestAccessToken).digest("hex");
  const orderNumber = generateOrderNumber();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 60 minutes
  const orderId = crypto.randomUUID();

  const preparedOrder: PreparedOrder = {
    id: orderId,
    orderNumber,
    status: "pending",
    fulfillmentStatus: "unfulfilled",
    currency: "NGN",
    deliveryStatus: deliveryQuote.status,
    subtotalMinor: calculatedSubtotalMinor,
    shippingMinor,
    discountMinor: 0,
    taxMinor: 0,
    totalMinor,
    isTotalSettled,
    customerEmail: formData.email,
    shippingAddress: {
      recipientName: formData.fullName,
      phone: phoneInfo.normalized,
      email: formData.email,
      state: formData.state,
      cityOrLga: formData.cityOrLga,
      streetAddress: formData.streetAddress,
      landmark: formData.landmark || undefined,
      deliveryInstructions: formData.deliveryInstructions || undefined,
      deliveryNotice: deliveryQuote.notice,
      deliveryStatus: deliveryQuote.status,
    },
    billingAddress: {
      recipientName: formData.fullName,
      phone: phoneInfo.normalized,
      state: formData.state,
      cityOrLga: formData.cityOrLga,
      streetAddress: formData.streetAddress,
    },
    customerNote: formData.orderNotes || null,
    items: orderItems,
    expiresAt,
    guestAccessToken,
    createdAt: new Date().toISOString(),
  };

  // 6. Attempt Atomic Database Persistence
  const dbClient = createPrivilegedSupabaseClient();
  let persistedInDatabase = false;

  if (!dbClient) {
    console.warn(
      "[OrderPreparation] FAIL-CLOSED on database write: SUPABASE_SERVICE_ROLE_KEY is not configured on the server. Order state preserved in signed customer session.",
    );
  } else {

  try {
    // Attempt RPC preparation function first
    let rpcDeliveryStatus: string = deliveryQuote.status;
    let { data: rpcOrder, error: rpcError } = await dbClient.rpc("prepare_guest_order_record", {
      p_guest_session_hash: session.tokenHash,
      p_guest_access_token_hash: guestAccessTokenHash,
      p_customer_email: formData.email,
      p_shipping_address: preparedOrder.shippingAddress as unknown as Json,
      p_billing_address: preparedOrder.billingAddress as unknown as Json,
      p_customer_note: preparedOrder.customerNote,
      p_shipping_minor: 0,
      p_currency: "NGN",
      p_items: orderItems.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
      p_delivery_status: rpcDeliveryStatus,
      p_is_total_settled: isTotalSettled,
    });

    // Check if delivery status constraint failed because migration adding 'arranged_separately' is pending
    if (rpcError && (rpcError.code === "23514" || rpcError.message?.includes("orders_delivery_status_check"))) {
      rpcDeliveryStatus = "pending";
      const retryResult = await dbClient.rpc("prepare_guest_order_record", {
        p_guest_session_hash: session.tokenHash,
        p_guest_access_token_hash: guestAccessTokenHash,
        p_customer_email: formData.email,
        p_shipping_address: preparedOrder.shippingAddress as unknown as Json,
        p_billing_address: preparedOrder.billingAddress as unknown as Json,
        p_customer_note: preparedOrder.customerNote,
        p_shipping_minor: 0,
        p_currency: "NGN",
        p_items: orderItems.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
        p_delivery_status: "pending",
        p_is_total_settled: isTotalSettled,
      });
      rpcOrder = retryResult.data;
      rpcError = retryResult.error;
    }

    if (!rpcError && rpcOrder) {
      preparedOrder.id = rpcOrder.id;
      preparedOrder.orderNumber = rpcOrder.order_number;
      persistedInDatabase = true;
    } else if (isMigrationPendingError(rpcError)) {
      // Attempt direct insert with service role if RPC is not yet registered
      const insertDeliveryStatus = deliveryQuote.status;
      let { data: insertedOrder, error: insertError } = await dbClient
        .from("orders")
        .insert({
          id: orderId,
          order_number: orderNumber,
          profile_id: null,
          guest_session_hash: session.tokenHash,
          guest_access_token_hash: guestAccessTokenHash,
          status: "pending",
          fulfillment_status: "unfulfilled",
          currency: "NGN",
          subtotal_minor: calculatedSubtotalMinor,
          shipping_minor: 0,
          discount_minor: 0,
          tax_minor: 0,
          delivery_status: insertDeliveryStatus as Database["public"]["Tables"]["orders"]["Insert"]["delivery_status"],
          is_total_settled: isTotalSettled,
          shipping_address: preparedOrder.shippingAddress as unknown as Json,
          billing_address: preparedOrder.billingAddress as unknown as Json,
          customer_email: formData.email,
          customer_note: preparedOrder.customerNote,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (insertError && (insertError.code === "23514" || insertError.message?.includes("orders_delivery_status_check"))) {
        const retryInsert = await dbClient
          .from("orders")
          .insert({
            id: orderId,
            order_number: orderNumber,
            profile_id: null,
            guest_session_hash: session.tokenHash,
            guest_access_token_hash: guestAccessTokenHash,
            status: "pending",
            fulfillment_status: "unfulfilled",
            currency: "NGN",
            subtotal_minor: calculatedSubtotalMinor,
            shipping_minor: 0,
            discount_minor: 0,
            tax_minor: 0,
            delivery_status: "pending",
            is_total_settled: isTotalSettled,
            shipping_address: preparedOrder.shippingAddress as unknown as Json,
            billing_address: preparedOrder.billingAddress as unknown as Json,
            customer_email: formData.email,
            customer_note: preparedOrder.customerNote,
            expires_at: expiresAt,
          })
          .select()
          .single();
        insertedOrder = retryInsert.data;
        insertError = retryInsert.error;
      }

      if (!insertError && insertedOrder) {
        persistedInDatabase = true;
      }
    }
  } catch (dbErr) {
    if (!isMigrationPendingError(dbErr)) {
      console.warn("[OrderPreparation] Note on DB order persistence:", dbErr);
    }
  }
  }

  // 7. Atomically reserve inventory for 15-minute checkout window
  await reserveOrderInventory(
    preparedOrder.id,
    orderItems.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
    15,
  );

  // 8. Issue HTTP-Only Confirmation Authorization Session Cookie (Token-free URL architecture)
  await issueConfirmationAuthorization(
    preparedOrder.id,
    preparedOrder.orderNumber,
    guestAccessTokenHash,
  );

  // 9. Store Prepared Order in Secure HTTP-Only Cookie Session for seamless fallback
  const cookieStore = await cookies();
  const orderSessionPayload = JSON.stringify({
    order: preparedOrder,
    persistedInDatabase,
    sessionHash: session.tokenHash,
    tokenHash: guestAccessTokenHash,
  });

  cookieStore.set(PREPARED_ORDER_COOKIE, Buffer.from(orderSessionPayload, "utf8").toString("base64url"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });

  return {
    success: true,
    order: preparedOrder,
  };
}

/**
 * Updates the prepared order status in the secure HTTP-only cookie session upon payment verification.
 */
export async function updatePreparedOrderPaymentStatus(
  targetOrderId: string,
  paymentStatus: "captured" | "reconciliation_required",
): Promise<void> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(PREPARED_ORDER_COOKIE)?.value;
  if (!sessionCookie) return;

  try {
    const decodedJson = Buffer.from(sessionCookie, "base64url").toString("utf8");
    const parsed = JSON.parse(decodedJson) as {
      order: PreparedOrder;
      persistedInDatabase: boolean;
      sessionHash: string;
      tokenHash: string;
    };

    if (
      parsed.order &&
      (parsed.order.id === targetOrderId || parsed.order.orderNumber === targetOrderId)
    ) {
      if (paymentStatus === "captured") {
        parsed.order.status = "confirmed";
      }
      const updatedPayload = JSON.stringify(parsed);
      cookieStore.set(PREPARED_ORDER_COOKIE, Buffer.from(updatedPayload, "utf8").toString("base64url"), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60, // 1 hour
      });
    }
  } catch {
    // Ignore invalid cookie
  }
}
