"use client";

import {
  createWhatsAppDeliveryUrl,
  createWhatsAppReconciliationUrl,
  siteConfig,
} from "@/config/site";
import { MessageCircle, Mail } from "lucide-react";

interface WhatsAppDeliveryButtonProps {
  orderNumber: string;
  paymentReference?: string | null;
  businessNumber?: string | null;
  label?: string;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
}

export function WhatsAppDeliveryButton({
  orderNumber,
  paymentReference,
  businessNumber,
  label = "ARRANGE DELIVERY ON WHATSAPP",
  className = "",
  variant = "primary",
}: WhatsAppDeliveryButtonProps) {
  const whatsappUrl = paymentReference && (!orderNumber || orderNumber === "SOL-SCENTS" || orderNumber.startsWith("pending"))
    ? createWhatsAppReconciliationUrl(paymentReference, orderNumber, businessNumber)
    : createWhatsAppDeliveryUrl(orderNumber, businessNumber);

  // Fallback if WhatsApp phone number is unconfigured or unavailable
  if (!whatsappUrl) {
    return (
      <div className="space-y-2 text-center" data-testid="whatsapp-fallback-container">
        <a
          href={`mailto:${siteConfig.contact.email}?subject=${encodeURIComponent(
            `Arrange Delivery for Order ${orderNumber}`,
          )}&body=${encodeURIComponent(
            `Hello Solure Scents,\n\nI have completed payment for my perfume order (Order ID: ${orderNumber}${paymentReference ? `, Ref: ${paymentReference}` : ""}) and would like to arrange delivery.\n\nThank you!`,
          )}`}
          className="inline-flex w-full items-center justify-center gap-2.5 border border-charcoal/20 bg-white px-6 py-4 text-xs font-semibold tracking-[0.16em] text-charcoal uppercase transition hover:border-gold hover:text-gold"
          data-testid="whatsapp-email-fallback-btn"
        >
          <Mail size={16} className="text-gold" />
          <span>Email Atelier to Arrange Delivery</span>
        </a>
        <p className="text-[11px] text-muted">
          WhatsApp concierge is currently offline. Our team will assist you via concierge email.
        </p>
      </div>
    );
  }

  const baseStyle =
    variant === "primary"
      ? "group relative flex w-full items-center justify-center gap-3 bg-[#25D366] px-6 py-4 text-xs sm:text-sm font-bold tracking-[0.16em] text-white uppercase shadow-md transition-all duration-300 hover:bg-[#1EBE5D] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 active:scale-[0.99]"
      : variant === "outline"
        ? "inline-flex w-full items-center justify-center gap-2 border-2 border-[#25D366] bg-transparent px-6 py-3.5 text-xs font-bold tracking-[0.14em] text-[#128C7E] uppercase transition hover:bg-[#25D366] hover:text-white"
        : "inline-flex items-center justify-center gap-2 border border-[#25D366] bg-[#25D366]/10 px-6 py-3 text-xs font-semibold tracking-wider text-[#128C7E] uppercase transition hover:bg-[#25D366] hover:text-white";

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseStyle} ${className}`}
      aria-label={`${label} for Order ${orderNumber}`}
      data-testid="whatsapp-delivery-btn"
    >
      <MessageCircle size={20} className="shrink-0 transition-transform group-hover:scale-110" />
      <span>{label}</span>
    </a>
  );
}

