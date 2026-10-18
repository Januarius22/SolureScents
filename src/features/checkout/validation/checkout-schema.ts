import { z } from "zod";
import { findNigerianState } from "../constants/nigerian-states";

/**
 * Normalizes and validates a Nigerian phone number.
 * Accepts formats:
 * - 080xxxxxxxx, 070xxxxxxxx, 081xxxxxxxx, 090xxxxxxxx, 091xxxxxxxx (11 digits local)
 * - +234xxxxxxxxxx, 234xxxxxxxxxx (international)
 * - Allows clean separation with spaces or dashes
 */
export function normalizeNigerianPhone(raw: string): {
  isValid: boolean;
  normalized: string;
  display: string;
  error?: string;
} {
  if (!raw || typeof raw !== "string") {
    return { isValid: false, normalized: "", display: "", error: "Phone number is required." };
  }

  // Remove whitespace, dashes, parentheses
  const clean = raw.trim().replace(/[\s\-()]/g, "");

  // Extract digits only
  const digits = clean.replace(/\D/g, "");

  let local10 = "";

  if (clean.startsWith("+234") && digits.length === 13) {
    local10 = digits.slice(3);
  } else if (clean.startsWith("234") && digits.length === 13) {
    local10 = digits.slice(3);
  } else if (clean.startsWith("0") && digits.length === 11) {
    local10 = digits.slice(1);
  } else if (digits.length === 10 && /^(70|80|81|90|91)/.test(digits)) {
    local10 = digits;
  } else {
    return {
      isValid: false,
      normalized: clean,
      display: clean,
      error: "Please enter a valid 11-digit Nigerian mobile number (e.g. 0803 123 4567 or +2348031234567).",
    };
  }

  // Ensure 10 digits and valid mobile network prefix: 70, 80, 81, 90, 91
  const isPrefixValid = /^(70|80|81|90|91)\d{8}$/.test(local10);
  if (!isPrefixValid) {
    return {
      isValid: false,
      normalized: clean,
      display: clean,
      error: "Number must start with a valid Nigerian mobile prefix (080, 081, 070, 090, 091).",
    };
  }

  const normalized = `+234${local10}`;
  const display = `0${local10.slice(0, 3)} ${local10.slice(3, 6)} ${local10.slice(6)}`;

  return {
    isValid: true,
    normalized,
    display,
  };
}

export const nigerianPhoneSchema = z
  .string()
  .trim()
  .min(10, "Phone number is too short.")
  .max(20, "Phone number is too long.")
  .refine(
    (val) => normalizeNigerianPhone(val).isValid,
    { message: "Please enter a valid Nigerian mobile phone number (e.g. 0803 123 4567 or +234 803 123 4567)." },
  );

export const nigerianStateSchema = z
  .string()
  .trim()
  .min(2, "Please select your delivery state.")
  .refine(
    (val) => Boolean(findNigerianState(val)),
    { message: "Please select a valid Nigerian state or the Federal Capital Territory." },
  );

export const guestCheckoutSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(100, "Full name cannot exceed 100 characters.")
    .refine((val) => val.includes(" ") || val.length >= 3, {
      message: "Please enter your first and last name.",
    }),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address for order notifications.")
    .max(120, "Email cannot exceed 120 characters.")
    .toLowerCase(),
  phone: nigerianPhoneSchema,
  state: nigerianStateSchema,
  cityOrLga: z
    .string()
    .trim()
    .min(2, "City or Local Government Area is required.")
    .max(100, "City/LGA cannot exceed 100 characters."),
  streetAddress: z
    .string()
    .trim()
    .min(5, "Please provide a complete street delivery address.")
    .max(250, "Street address cannot exceed 250 characters."),
  landmark: z
    .string()
    .trim()
    .max(150, "Landmark note cannot exceed 150 characters.")
    .optional()
    .or(z.literal("")),
  deliveryInstructions: z
    .string()
    .trim()
    .max(500, "Delivery instructions cannot exceed 500 characters.")
    .optional()
    .or(z.literal("")),
  orderNotes: z
    .string()
    .trim()
    .max(500, "Order notes cannot exceed 500 characters.")
    .optional()
    .or(z.literal("")),
});

export type GuestCheckoutInput = z.infer<typeof guestCheckoutSchema>;
