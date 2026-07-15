import { z } from "zod";

export const addressSchema = z.object({
  city: z.string().trim().min(2).max(100),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  label: z.string().trim().min(1).max(40),
  line1: z.string().trim().min(3).max(180),
  line2: z.string().trim().max(180).optional(),
  phone: z.string().trim().min(7).max(30),
  postalCode: z.string().trim().max(20).optional(),
  recipientName: z.string().trim().min(2).max(120),
  stateRegion: z.string().trim().min(2).max(100),
});

export const beginCheckoutSchema = z.object({ cartId: z.uuid() });
