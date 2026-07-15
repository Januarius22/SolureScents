import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/features/auth/services/authorization";
import { addCartItemSchema, type AddCartItemInput } from "@/features/cart/validation/cart";

/** Atomically adds a trusted-price item to the authenticated customer's active cart. */
export async function addItemToCart(input: AddCartItemInput) {
  const parsed = addCartItemSchema.parse(input);
  const access = await getCurrentUserAccess();
  if (!access) throw new Error("Authentication is required to update a cart.");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("add_cart_item", {
    add_quantity: parsed.quantity,
    target_variant_id: parsed.variantId,
  });

  if (error) throw new Error("Unable to add this fragrance to the cart.", { cause: error });
  return data;
}

/** Loads the active cart and its line items through customer ownership RLS. */
export async function getActiveCart() {
  const access = await getCurrentUserAccess();
  if (!access) return null;
  const supabase = await createServerSupabaseClient();
  const { data: cart, error: cartError } = await supabase
    .from("carts")
    .select("id, currency, expires_at")
    .eq("profile_id", access.id)
    .eq("status", "active")
    .maybeSingle();

  if (cartError) throw new Error("Unable to load the cart.", { cause: cartError });
  if (!cart) return null;

  const { data: items, error: itemError } = await supabase
    .from("cart_items")
    .select("id, variant_id, quantity, unit_price_minor, currency")
    .eq("cart_id", cart.id)
    .order("created_at");
  if (itemError) throw new Error("Unable to load cart items.", { cause: itemError });
  return { ...cart, items };
}
