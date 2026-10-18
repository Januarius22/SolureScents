import { z } from "zod";

export const addCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1.").max(99, "Quantity limit is 99."),
  variantId: z.string().uuid("Please select a valid bottle size."),
});

export const updateCartItemSchema = z.object({
  itemId: z.string().min(1, "Item identifier is required."),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative.").max(99, "Quantity limit is 99."),
});

export const removeCartItemSchema = z.object({
  itemId: z.string().min(1, "Item identifier is required."),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type RemoveCartItemInput = z.infer<typeof removeCartItemSchema>;
