"use server";

import { updateTag } from "next/cache";

import { addItemToCart } from "@/features/cart/services/cart-service";
import { addCartItemSchema } from "@/features/cart/validation/cart";
import type { ServiceResult } from "@/types/common";

/** Validated Server Action boundary for authenticated cart additions. */
export async function addCartItemAction(formData: FormData): Promise<ServiceResult<{ itemId: string }, "INVALID_INPUT" | "CART_ERROR">> {
  const parsed = addCartItemSchema.safeParse({
    quantity: formData.get("quantity"),
    variantId: formData.get("variantId"),
  });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT", message: "Choose a valid size and quantity." };

  try {
    const item = await addItemToCart(parsed.data);
    updateTag("cart");
    return { ok: true, data: { itemId: item.id } };
  } catch (error) {
    console.error("Cart addition failed", error);
    return { ok: false, code: "CART_ERROR", message: "This fragrance could not be added to your cart." };
  }
}
