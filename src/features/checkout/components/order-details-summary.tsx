"use client";

import { useState } from "react";
import {
  ShoppingBag,
  MapPin,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import type { PreparedOrder } from "../types";
import { WhatsAppDeliveryButton } from "./whatsapp-delivery-button";
import { DownloadReceiptButton } from "./download-receipt-button";

interface OrderDetailsSummaryProps {
  order: PreparedOrder;
  paymentStatus?: string;
  paymentReference?: string | null;
  paymentDate?: string | null;
  showReceiptDownload?: boolean;
  showWhatsAppCta?: boolean;
  isExpandable?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

function formatMoney(amountMinor: number): string {
  const naira = Math.floor(amountMinor / 100);
  return `₦${naira.toLocaleString("en-NG")}`;
}

export function OrderDetailsSummary({
  order,
  paymentStatus = "Verified via Paystack",
  paymentReference,
  paymentDate,
  showReceiptDownload = true,
  showWhatsAppCta = true,
  isExpandable = false,
  defaultExpanded = true,
  className = "",
}: OrderDetailsSummaryProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

  const formattedDate = paymentDate
    ? new Date(paymentDate).toLocaleDateString("en-NG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : order.createdAt
      ? new Date(order.createdAt).toLocaleDateString("en-NG", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date().toLocaleDateString("en-NG", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

  return (
    <div
      className={`border border-charcoal/15 bg-white text-left transition-all ${className}`}
      data-testid="order-details-summary"
    >
      {/* Expandable Header or Static Brand Banner */}
      {isExpandable ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between border-b border-charcoal/10 bg-ivory/40 px-6 py-4 text-left transition hover:bg-ivory"
          aria-expanded={isOpen}
          data-testid="toggle-order-details-btn"
        >
          <div className="flex items-center gap-3">
            <ShoppingBag size={18} className="text-gold" />
            <div>
              <p className="text-xs font-semibold tracking-wider text-charcoal uppercase">
                Order Summary & Line Items
              </p>
              <p className="text-[11px] text-muted">
                {order.items.reduce((s, i) => s + i.quantity, 0)} flacons · {formatMoney(order.totalMinor)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-gold">
            <span>{isOpen ? "Hide Details" : "View Order Details"}</span>
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>
      ) : (
        <div className="border-b border-charcoal/10 bg-ivory/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-gold" />
              <span className="text-xs font-semibold tracking-wider text-charcoal uppercase">
                Solure Scents Atelier · Official Order Details
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-charcoal">{order.orderNumber}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isOpen && (
        <div className="p-6 sm:p-8 space-y-8">
          {/* Top Summary Banner: Order ID, Date, Customer & Status */}
          <div className="grid grid-cols-1 gap-4 border-b border-charcoal/10 pb-6 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div>
              <span className="text-muted uppercase text-[10px] tracking-wider block">Order Reference</span>
              <span className="font-mono text-sm font-bold text-charcoal" data-testid="summary-order-number">
                {order.orderNumber}
              </span>
            </div>

            <div>
              <span className="text-muted uppercase text-[10px] tracking-wider block">Order Date</span>
              <span className="font-medium text-charcoal">{formattedDate}</span>
            </div>

            <div>
              <span className="text-muted uppercase text-[10px] tracking-wider block">Payment Status</span>
              {paymentStatus.includes("PAID") || paymentStatus.includes("Verified") ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700" data-testid="summary-payment-status">
                  <ShieldCheck size={13} className="text-emerald-600" />
                  <span>{paymentStatus}</span>
                </span>
              ) : paymentStatus.includes("Progress") || paymentStatus.includes("Review") ? (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-800" data-testid="summary-payment-status">
                  <Clock size={13} className="text-amber-700" />
                  <span>{paymentStatus}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-charcoal" data-testid="summary-payment-status">
                  <Clock size={13} className="text-amber-600" />
                  <span>{paymentStatus}</span>
                </span>
              )}
              {paymentReference && (
                <span className="block font-mono text-[10px] text-muted truncate mt-0.5">
                  Ref: {paymentReference}
                </span>
              )}
            </div>

            <div>
              <span className="text-muted uppercase text-[10px] tracking-wider block">Delivery Status</span>
              <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                <Clock size={13} className="text-amber-700" />
                <span>Arranged Separately</span>
              </span>
            </div>
          </div>

          {/* 2-Column Grid: Purchased Perfumes (Left) and Destination + Disclosures (Right) */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Column 1: Purchased Perfumes */}
            <div>
              <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
                <h3 className="font-display text-base text-charcoal">Purchased Fragrances</h3>
                <span className="text-xs text-muted">
                  {order.items.reduce((s, i) => s + i.quantity, 0)} flacons
                </span>
              </div>

              <div className="mt-4 divide-y divide-charcoal/10">
                {order.items.map((item, idx) => {
                  const sizeDisplay =
                    item.sizeMl > 0 ? `${item.sizeMl}ml Flacon` : item.variantLabel || "Standard Flacon";

                  return (
                    <div key={idx} className="flex justify-between py-3 text-xs">
                      <div className="pr-3">
                        <p className="font-semibold text-charcoal">{item.productName}</p>
                        <p className="text-[11px] text-muted mt-0.5">
                          Bottle Size: <span className="font-medium text-charcoal/90">{sizeDisplay}</span>
                        </p>
                        <p className="text-[11px] text-muted">
                          Qty: {item.quantity} × {formatMoney(item.unitPriceMinor)}
                        </p>
                      </div>
                      <div className="text-right font-mono font-medium text-charcoal self-center">
                        {formatMoney(item.lineTotalMinor)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Subtotals & Total */}
              <div className="mt-6 space-y-2 border-t border-charcoal/10 pt-4 text-xs">
                <div className="flex justify-between text-muted">
                  <span>Bag Subtotal</span>
                  <span className="font-mono text-charcoal">{formatMoney(order.subtotalMinor)}</span>
                </div>

                {order.discountMinor > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span className="font-mono">- {formatMoney(order.discountMinor)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-muted">
                  <span>Delivery Service</span>
                  <span className="text-right">
                    <span className="font-semibold text-charcoal block">Arranged Separately</span>
                    <span className="text-[10px] text-muted block">Confirmed via WhatsApp</span>
                  </span>
                </div>

                <div className="flex items-baseline justify-between border-t border-charcoal/15 pt-3">
                  <div>
                    <span className="font-semibold text-charcoal text-sm">Perfume Total</span>
                    <p className="text-[10px] text-muted">
                      Paid online via Paystack (excludes delivery fees)
                    </p>
                  </div>
                  <span className="font-display text-lg font-bold text-charcoal" data-testid="summary-total-amount">
                    {formatMoney(order.totalMinor)}
                  </span>
                </div>
              </div>
            </div>

            {/* Column 2: Delivery Destination & Delivery Disclosures */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 border-b border-charcoal/10 pb-3">
                  <MapPin size={15} className="text-gold" />
                  <h3 className="font-display text-base text-charcoal">Delivery Destination</h3>
                </div>

                <div className="mt-4 space-y-2.5 text-xs text-charcoal/90">
                  <p>
                    <span className="font-semibold text-charcoal">Recipient:</span>{" "}
                    {order.shippingAddress.recipientName}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone size={12} className="text-gold" />
                    <span className="font-mono">{order.shippingAddress.phone}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Mail size={12} className="text-gold" />
                    <span>{order.customerEmail}</span>
                  </p>
                  <div className="border-t border-charcoal/10 pt-2.5 space-y-1">
                    <p className="font-semibold text-charcoal">Delivery Address:</p>
                    <p>{order.shippingAddress.streetAddress}</p>
                    <p>
                      {order.shippingAddress.cityOrLga}, {order.shippingAddress.state} State
                    </p>
                    {order.shippingAddress.landmark && (
                      <p className="text-muted">Landmark: {order.shippingAddress.landmark}</p>
                    )}
                    {order.shippingAddress.deliveryInstructions && (
                      <p className="text-muted italic">Note: {order.shippingAddress.deliveryInstructions}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Atelier Delivery Policy Disclosure */}
              <div className="rounded-none border border-gold/40 bg-champagne/15 p-4 text-xs">
                <p className="font-semibold text-charcoal text-[11px] uppercase tracking-wider">
                  Solure Scents Atelier Delivery Policy
                </p>
                <p className="mt-1.5 text-muted leading-relaxed">
                  Delivery charges are arranged separately and are not included in the perfume purchase total shown above.
                </p>
              </div>

              {/* Action Buttons: WhatsApp Delivery CTA & Download PDF Receipt */}
              <div className="space-y-3 pt-2">
                {showWhatsAppCta && (
                  <WhatsAppDeliveryButton
                    orderNumber={order.orderNumber}
                    paymentReference={paymentReference}
                    label="ARRANGE DELIVERY ON WHATSAPP"
                  />
                )}

                {showReceiptDownload && (
                  <div className="w-full">
                    <DownloadReceiptButton
                      orderId={order.id}
                      orderNumber={order.orderNumber}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
