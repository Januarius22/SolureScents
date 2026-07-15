import { z } from "zod";

export const addCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(99),
  variantId: z.uuid(),
});

export const removeCartItemSchema = z.object({ itemId: z.uuid() });

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
