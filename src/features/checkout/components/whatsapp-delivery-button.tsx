"use client";

import { createWhatsAppDeliveryUrl, siteConfig } from "@/config/site";
import { MessageCircle, Mail } from "lucide-react";

interface WhatsAppDeliveryButtonProps {
  orderNumber: string;
  businessNumber?: string | null;
  className?: string;
  variant?: "primary" | "secondary";
}

export function WhatsAppDeliveryButton({
  orderNumber,
  businessNumber,
  className = "",
  variant = "primary",
}: WhatsAppDeliveryButtonProps) {
  const whatsappUrl = createWhatsAppDeliveryUrl(orderNumber, businessNumber);

  // Fallback if WhatsApp phone number is unconfigured or unavailable
  if (!whatsappUrl) {
    return (
      <div className="space-y-2 text-center">
        <a
          href={`mailto:${siteConfig.contact.email}?subject=${encodeURIComponent(
            `Arrange Delivery for Order ${orderNumber}`,
          )}&body=${encodeURIComponent(
            `Hello Solure Scents,\n\nI just paid for my perfume order (Order ID: ${orderNumber}) and would like to arrange delivery.\n\nThank you!`,
          )}`}
          className="inline-flex w-full items-center justify-center gap-2.5 border border-charcoal/20 bg-white px-6 py-4 text-xs font-semibold tracking-[0.16em] text-charcoal uppercase transition hover:border-gold hover:text-gold"
        >
          <Mail size={16} className="text-gold" />
          <span>Email Atelier to Arrange Delivery</span>
        </a>
        <p className="text-[11px] text-muted">
          WhatsApp concierge is currently offline. Our team has received your order and will contact you via email.
        </p>
      </div>
    );
  }

  const baseStyle =
    variant === "primary"
      ? "group relative flex w-full items-center justify-center gap-3 bg-[#25D366] px-8 py-4 text-xs font-semibold tracking-[0.18em] text-white uppercase shadow-md transition-all duration-300 hover:bg-[#1EBE5D] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]/40"
      : "inline-flex items-center justify-center gap-2 border border-[#25D366] bg-[#25D366]/10 px-6 py-3 text-xs font-semibold tracking-wider text-[#128C7E] uppercase transition hover:bg-[#25D366] hover:text-white";

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseStyle} ${className}`}
      aria-label={`Arrange Delivery on WhatsApp for Order ${orderNumber}`}
      data-testid="whatsapp-delivery-btn"
    >
      <MessageCircle size={18} className="shrink-0 transition-transform group-hover:scale-110" />
      <span>Arrange Delivery on WhatsApp</span>
    </a>
  );
}
