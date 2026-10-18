import { createServerSupabaseClient, createPrivilegedSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/features/auth/services/authorization";
import {
  addCartItemSchema,
  updateCartItemSchema,
  removeCartItemSchema,
  type AddCartItemInput,
  type UpdateCartItemInput,
  type RemoveCartItemInput,
} from "@/features/cart/validation/cart";
import {
  getOrCreateGuestSession,
  readGuestSession,
  readGuestCartPayload,
  writeGuestCartPayload,
  clearGuestCartCookie,
} from "./guest-session";
import type { Cart, CartItem } from "@/features/cart/types";

/**
 * Distinguishes missing database migration/RPC errors from genuine operational failures.
 * Used to safely engage cookie session fallback without masking real DB outages or constraint violations.
 */
function isMissingRpcError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    Boolean(error.message?.includes("Could not find the function")) ||
    Boolean(error.message?.includes("does not exist"))
  );
}

/**
 * Validates a variant and its parent product directly against live Supabase database records.
 * Ensures the perfume is active, available, and priced accurately in NGN kobo.
 */
async function fetchTrustedVariant(variantId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select(`
      id,
      product_id,
      label,
      size_ml,
      sku,
      price_minor,
      compare_at_price_minor,
      currency,
      status,
      is_available,
      products (
        id,
        name,
        slug,
        subtitle,
        concentration,
        status,
        brand_id
      )
    `)
    .eq("id", variantId)
    .single();

  if (variantError || !variant) {
    throw new Error("Fragrance variant not found.", { cause: variantError });
  }

  const product = variant.products as unknown as {
    id: string;
    name: string;
    slug: string;
    subtitle: string | null;
    concentration: string;
    status: string;
  } | null;

  if (!product || product.status !== "active" || variant.status !== "active" || !variant.is_available) {
    throw new Error("This fragrance is currently unavailable.");
  }

  return { variant, product };
}

/**
 * Atomically adds a perfume selection to the shopping bag.
 * Seamlessly supports both anonymous guest shoppers (without accounts) and authenticated staff.
 */
export async function addItemToCart(input: AddCartItemInput): Promise<{ itemId: string }> {
  const parsed = addCartItemSchema.parse(input);
  await fetchTrustedVariant(parsed.variantId);

  // If authenticated user/staff session exists, also sync to database cart (best-effort)
  try {
    const access = await getCurrentUserAccess();
    if (access) {
      const supabase = await createServerSupabaseClient();
      await supabase.rpc("add_cart_item", {
        add_quantity: parsed.quantity,
        target_variant_id: parsed.variantId,
      });
    }
  } catch {
    // Non-fatal: do not block shopping bag experience if auth check or DB RPC fails
  }

  // Ensure guest session and signed cookie cart are ALWAYS updated for unified shopping experience
  const session = await getOrCreateGuestSession();
  const dbClient = createPrivilegedSupabaseClient() ?? (await createServerSupabaseClient());

  // Try database RPC if migration has been executed in Supabase
  try {
    const { data: rpcData, error: rpcError } = await dbClient.rpc("add_guest_cart_item", {
      p_session_token_hash: session.tokenHash,
      target_variant_id: parsed.variantId,
      add_quantity: parsed.quantity,
    });

    if (rpcError) {
      if (!isMissingRpcError(rpcError)) {
        console.error("Database operational error during add_guest_cart_item:", rpcError);
        throw new Error(rpcError.message || "Database error adding fragrance to cart.");
      }
      // Missing migration: proceed to secure HMAC cookie fallback
    } else if (rpcData) {
      // Sync cookie state for instant client responsiveness
      const currentPayload = (await readGuestCartPayload()) ?? { sessionId: session.tokenHash, items: [], updatedAt: Date.now() };
      const existing = currentPayload.items.find((x) => x.variantId === parsed.variantId);
      if (existing) {
        existing.quantity = Math.min(99, existing.quantity + parsed.quantity);
      } else {
        currentPayload.items.push({ variantId: parsed.variantId, quantity: parsed.quantity });
      }
      await writeGuestCartPayload(currentPayload.items);
      return { itemId: rpcData.id };
    }
  } catch (err) {
    if (!isMissingRpcError(err as { code?: string; message?: string })) {
      throw err;
    }
  }

  // Secure cookie session fallback (always reliable, fully signed, server-verified)
  const currentPayload = (await readGuestCartPayload()) ?? { sessionId: session.tokenHash, items: [], updatedAt: Date.now() };
  const existing = currentPayload.items.find((x) => x.variantId === parsed.variantId);
  if (existing) {
    existing.quantity = Math.min(99, existing.quantity + parsed.quantity);
  } else {
    currentPayload.items.push({ variantId: parsed.variantId, quantity: parsed.quantity });
  }

  await writeGuestCartPayload(currentPayload.items);
  return { itemId: parsed.variantId };
}

/**
 * Updates the quantity of a specific item in the cart.
 * If quantity is 0, removes the item.
 */
export async function updateCartItemQuantity(input: UpdateCartItemInput): Promise<void> {
  const parsed = updateCartItemSchema.parse(input);
  const session = await getOrCreateGuestSession();

  // If quantity is 0, remove item
  if (parsed.quantity <= 0) {
    await removeCartItem({ itemId: parsed.itemId });
    return;
  }

  // If authenticated, also update database cart (best-effort)
  try {
    const access = await getCurrentUserAccess();
    if (access) {
      const supabase = await createServerSupabaseClient();
      const { data: dbCart } = await supabase
        .from("carts")
        .select("id")
        .eq("profile_id", access.id)
        .eq("status", "active")
        .maybeSingle();

      if (dbCart) {
        await supabase
          .from("cart_items")
          .update({ quantity: parsed.quantity })
          .eq("cart_id", dbCart.id)
          .eq("variant_id", parsed.itemId);
      }
    }
  } catch {
    // Non-fatal
  }

  const dbClient = createPrivilegedSupabaseClient() ?? (await createServerSupabaseClient());

  // Try database RPC if migration executed
  try {
    const { error: rpcError } = await dbClient.rpc("update_guest_cart_item", {
      p_session_token_hash: session.tokenHash,
      target_item_id: parsed.itemId,
      new_quantity: parsed.quantity,
    });

    if (rpcError) {
      if (!isMissingRpcError(rpcError)) {
        console.error("Database operational error during update_guest_cart_item:", rpcError);
        throw new Error(rpcError.message || "Failed to update item quantity in database.");
      }
    } else {
      const payload = await readGuestCartPayload();
      if (payload) {
        const item = payload.items.find((x) => x.variantId === parsed.itemId);
        if (item) {
          item.quantity = parsed.quantity;
          await writeGuestCartPayload(payload.items);
        }
      }
      return;
    }
  } catch (err) {
    if (!isMissingRpcError(err as { code?: string; message?: string })) {
      throw err;
    }
  }

  // Update in secure cookie state
  const payload = await readGuestCartPayload();
  if (payload) {
    const item = payload.items.find((x) => x.variantId === parsed.itemId);
    if (item) {
      item.quantity = parsed.quantity;
      await writeGuestCartPayload(payload.items);
    }
  }
}

/**
 * Removes an item from the cart.
 */
export async function removeCartItem(input: RemoveCartItemInput): Promise<void> {
  const parsed = removeCartItemSchema.parse(input);
  const session = await getOrCreateGuestSession();

  // If authenticated, also remove from database cart (best-effort)
  try {
    const access = await getCurrentUserAccess();
    if (access) {
      const supabase = await createServerSupabaseClient();
      const { data: dbCart } = await supabase
        .from("carts")
        .select("id")
        .eq("profile_id", access.id)
        .eq("status", "active")
        .maybeSingle();

      if (dbCart) {
        await supabase
          .from("cart_items")
          .delete()
          .eq("cart_id", dbCart.id)
          .eq("variant_id", parsed.itemId);
      }
    }
  } catch {
    // Non-fatal
  }

  const dbClient = createPrivilegedSupabaseClient() ?? (await createServerSupabaseClient());

  try {
    const { error: rpcError } = await dbClient.rpc("remove_guest_cart_item", {
      p_session_token_hash: session.tokenHash,
      target_item_id: parsed.itemId,
    });
    if (rpcError && !isMissingRpcError(rpcError)) {
      console.error("Database error during item removal:", rpcError);
    }
  } catch (err) {
    if (!isMissingRpcError(err as { code?: string; message?: string })) {
      console.error("Database error during item removal:", err);
    }
  }

  const payload = await readGuestCartPayload();
  if (payload) {
    const updated = payload.items.filter((x) => x.variantId !== parsed.itemId);
    await writeGuestCartPayload(updated);
  }
}

/**
 * Clears the active cart.
 */
export async function clearCart(): Promise<void> {
  try {
    const access = await getCurrentUserAccess();
    if (access) {
      const supabase = await createServerSupabaseClient();
      await supabase
        .from("carts")
        .update({ status: "abandoned" })
        .eq("profile_id", access.id)
        .eq("status", "active");
    }
  } catch {
    // Non-fatal
  }
  await clearGuestCartCookie();
}

/**
 * Loads the active cart with live, server-validated prices, bottle details, and totals in NGN.
 * Prices are strictly evaluated from the database and NEVER trusted from client submissions.
 */
export async function getActiveCart(): Promise<Cart | null> {
  const session = await readGuestSession();
  const payload = await readGuestCartPayload();

  let itemsToLoad = payload?.items ?? [];

  // If cookie payload is empty, check if authenticated session has database cart items
  if (itemsToLoad.length === 0) {
    try {
      const access = await getCurrentUserAccess();
      if (access) {
        const supabase = await createServerSupabaseClient();
        const { data: dbCart } = await supabase
          .from("carts")
          .select("id")
          .eq("profile_id", access.id)
          .eq("status", "active")
          .maybeSingle();

        if (dbCart) {
          const { data: dbItems } = await supabase
            .from("cart_items")
            .select("variant_id, quantity")
            .eq("cart_id", dbCart.id);

          if (dbItems && dbItems.length > 0) {
            itemsToLoad = dbItems.map((i) => ({ variantId: i.variant_id, quantity: i.quantity }));
            // Reconcile into signed cookie state
            await writeGuestCartPayload(itemsToLoad);
          }
        }
      }
    } catch {
      // Non-fatal: continue with empty cart
    }
  }

  if (itemsToLoad.length === 0) {
    return {
      id: session?.tokenHash ?? "empty",
      currency: "NGN",
      items: [],
      itemCount: 0,
      subtotalMinor: 0,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isGuest: true,
    };
  }

  const variantIds = itemsToLoad.map((x) => x.variantId);
  const supabase = await createServerSupabaseClient();

  const { data: variants, error } = await supabase
    .from("product_variants")
    .select(`
      id,
      product_id,
      label,
      size_ml,
      sku,
      price_minor,
      compare_at_price_minor,
      currency,
      status,
      is_available,
      products (
        id,
        name,
        slug,
        subtitle,
        concentration,
        status
      )
    `)
    .in("id", variantIds);

  if (error || !variants) {
    console.error("Failed to load cart items from database", error);
    return null;
  }

  const variantMap = new Map(variants.map((v) => [v.id, v]));
  const cartItems: CartItem[] = [];

  for (const item of itemsToLoad) {
    const v = variantMap.get(item.variantId);
    if (!v) continue;

    const prod = v.products as unknown as {
      id: string;
      name: string;
      slug: string;
      subtitle: string | null;
      concentration: string;
      status: string;
    } | null;

    if (!prod || prod.status !== "active") continue;

    const isAvailable = v.status === "active" && v.is_available;
    const quantity = Math.min(99, Math.max(1, item.quantity));
    const unitPriceMinor = v.price_minor;
    const lineTotalMinor = unitPriceMinor * quantity;

    cartItems.push({
      id: v.id,
      variantId: v.id,
      productId: prod.id,
      productName: prod.name,
      productSlug: prod.slug,
      subtitle: prod.subtitle,
      concentration: prod.concentration,
      variantLabel: v.label,
      sizeMl: v.size_ml,
      sku: v.sku,
      unitPriceMinor,
      currency: v.currency,
      quantity,
      lineTotalMinor,
      isAvailable,
    });
  }

  const subtotalMinor = cartItems.reduce((acc, curr) => acc + (curr.isAvailable ? curr.lineTotalMinor : 0), 0);
  const itemCount = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);

  return {
    id: session?.tokenHash ?? "guest-cart",
    currency: "NGN",
    items: cartItems,
    itemCount,
    subtotalMinor,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isGuest: true,
  };
}
