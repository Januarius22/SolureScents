export const siteConfig = {
  name: "Solure Scents",
  tagline: "Scents That Speak. Memories That Stay.",
  description:
    "Discover an edited collection of remarkable fragrances, chosen for the memories they leave behind.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  contact: {
    location: "Abuja, FCT, Nigeria",
    email: "concierge@solurescents.com",
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "+2347082189621",
    instagram: "https://www.instagram.com/solurescents/",
  },
} as const;

/**
 * Sanitizes a phone number for the standard WhatsApp wa.me click-to-chat URL by stripping non-digit characters.
 */
export function formatWhatsAppPhoneNumber(phone?: string | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

/**
 * Generates the official post-payment WhatsApp delivery arrangement URL.
 * URL format: https://wa.me/<business_number>?text=<encoded_message>
 *
 * Security & Privacy:
 * - Dynamically formats the message with the actual database order number.
 * - Encodes message text with encodeURIComponent.
 * - NEVER includes guest access tokens, secrets, or internal database UUIDs.
 * - Returns null if no valid business phone number is configured.
 */
export function createWhatsAppDeliveryUrl(
  orderNumber: string,
  businessNumber?: string | null,
): string | null {
  const rawNumber = businessNumber ?? siteConfig.contact.whatsappNumber;
  const sanitizedNumber = formatWhatsAppPhoneNumber(rawNumber);

  if (!sanitizedNumber || sanitizedNumber.length < 7) {
    return null;
  }

  const message = [
    "Hello Solure Scents! 👋",
    "",
    "I've successfully completed payment for my perfume order.",
    "",
    `Order ID: ${orderNumber}`,
    "",
    "I would like to arrange delivery and receive my waybill details.",
    "",
    "Please confirm the delivery fee and next steps.",
    "",
    "Thank you!",
  ].join("\n");

  return `https://wa.me/${sanitizedNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates a WhatsApp support URL for orders under review / reconciliation.
 * Prefills both the verified Paystack reference and the available order number.
 */
export function createWhatsAppReconciliationUrl(
  paymentReference: string,
  orderNumber?: string | null,
  businessNumber?: string | null,
): string | null {
  const rawNumber = businessNumber ?? siteConfig.contact.whatsappNumber;
  const sanitizedNumber = formatWhatsAppPhoneNumber(rawNumber);

  if (!sanitizedNumber || sanitizedNumber.length < 7) {
    return null;
  }

  const orderLine = orderNumber ? `Order ID: ${orderNumber}\n` : "";
  const message = [
    "Hello Solure Scents! 👋",
    "",
    "I've completed payment for my perfume order via Paystack.",
    "",
    `Payment Reference: ${paymentReference}`,
    orderLine.trim(),
    "",
    "I would like to finalize my order confirmation and arrange delivery waybill details.",
    "",
    "Kindly confirm my order status and let me know the next steps.",
    "",
    "Thank you!",
  ].filter(Boolean).join("\n");

  return `https://wa.me/${sanitizedNumber}?text=${encodeURIComponent(message)}`;
}

