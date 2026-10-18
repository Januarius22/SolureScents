"use server";

import { revalidatePath } from "next/cache";
import {
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  getActiveCart,
} from "@/features/cart/services/cart-service";
import {
  addCartItemSchema,
  updateCartItemSchema,
  removeCartItemSchema,
} from "@/features/cart/validation/cart";
import type { Cart } from "@/features/cart/types";
import type { ServiceResult } from "@/types/common";

/**
 * Validated Server Action boundary for guest and customer cart additions.
 */
export async function addCartItemAction(
  formData: FormData,
): Promise<ServiceResult<{ itemId: string; cart: Cart | null }, "INVALID_INPUT" | "CART_ERROR">> {
  const parsed = addCartItemSchema.safeParse({
    quantity: formData.get("quantity"),
    variantId: formData.get("variantId"),
  });

  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message ?? "Choose a valid size and quantity.";
    return { ok: false, code: "INVALID_INPUT", message: errorMsg };
  }

  try {
    const item = await addItemToCart(parsed.data);
    const cart = await getActiveCart();
    revalidatePath("/cart");
    revalidatePath("/shop", "layout");
    return { ok: true, data: { itemId: item.itemId, cart } };
  } catch (error) {
    console.error("Cart addition failed", error);
    const message = error instanceof Error ? error.message : "This fragrance could not be added to your bag.";
    return { ok: false, code: "CART_ERROR", message };
  }
}

/**
 * Direct programmatic Server Action to add an item to the cart.
 */
export async function addToCartAction(
  variantId: string,
  quantity = 1,
): Promise<ServiceResult<{ itemId: string; cart: Cart | null }, "INVALID_INPUT" | "CART_ERROR">> {
  const parsed = addCartItemSchema.safeParse({ variantId, quantity });
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message ?? "Invalid size or quantity.";
    return { ok: false, code: "INVALID_INPUT", message: errorMsg };
  }

  try {
    const item = await addItemToCart(parsed.data);
    const cart = await getActiveCart();
    revalidatePath("/cart");
    revalidatePath("/shop", "layout");
    return { ok: true, data: { itemId: item.itemId, cart } };
  } catch (error) {
    console.error("Cart addition failed", error);
    const message = error instanceof Error ? error.message : "This fragrance could not be added to your bag.";
    return { ok: false, code: "CART_ERROR", message };
  }
}

/**
 * Progressive-enhancement adapter for plain server-rendered product forms.
 */
export async function addCartItemFormAction(formData: FormData): Promise<void> {
  await addCartItemAction(formData);
}

/**
 * Server Action to update quantity of a specific item.
 */
export async function updateCartItemAction(
  itemId: string,
  quantity: number,
): Promise<ServiceResult<{ cart: Cart | null }, "INVALID_INPUT" | "CART_ERROR">> {
  const parsed = updateCartItemSchema.safeParse({ itemId, quantity });
  if (!parsed.success) {
    return { ok: false, code: "INVALID_INPUT", message: "Please specify a valid quantity between 1 and 99." };
  }

  try {
    await updateCartItemQuantity(parsed.data);
    const cart = await getActiveCart();
    revalidatePath("/cart");
    revalidatePath("/shop", "layout");
    return { ok: true, data: { cart } };
  } catch (error) {
    console.error("Cart quantity update failed", error);
    const message = error instanceof Error ? error.message : "Unable to adjust quantity.";
    return { ok: false, code: "CART_ERROR", message };
  }
}

/**
 * Server Action to remove an item from the cart.
 */
export async function removeCartItemAction(
  itemId: string,
): Promise<ServiceResult<{ cart: Cart | null }, "INVALID_INPUT" | "CART_ERROR">> {
  const parsed = removeCartItemSchema.safeParse({ itemId });
  if (!parsed.success) {
    return { ok: false, code: "INVALID_INPUT", message: "Invalid item reference." };
  }

  try {
    await removeCartItem(parsed.data);
    const cart = await getActiveCart();
    revalidatePath("/cart");
    revalidatePath("/shop", "layout");
    return { ok: true, data: { cart } };
  } catch (error) {
    console.error("Cart item removal failed", error);
    const message = error instanceof Error ? error.message : "Unable to remove item.";
    return { ok: false, code: "CART_ERROR", message };
  }
}

/**
 * Server Action to retrieve the latest active cart state.
 */
export async function getActiveCartAction(): Promise<Cart | null> {
  return getActiveCart();
}
