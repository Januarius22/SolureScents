"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import type { PreparedOrder } from "../types";
import { WhatsAppDeliveryButton } from "./whatsapp-delivery-button";
import { DownloadReceiptButton } from "./download-receipt-button";
import { OrderDetailsSummary } from "./order-details-summary";

interface PostPaymentSuccessCardProps {
  orderNumber: string;
  amountMinor: number;
  currency?: string;
  orderId?: string | null;
  paymentReference?: string | null;
  order?: PreparedOrder | null;
  className?: string;
}

function formatMoney(amountMinor: number): string {
  const naira = Math.floor(amountMinor / 100);
  return `₦${naira.toLocaleString("en-NG")}`;
}

export function PostPaymentSuccessCard({
  orderNumber,
  amountMinor,
  orderId,
  paymentReference,
  order,
  className = "",
}: PostPaymentSuccessCardProps) {
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  return (
    <div
      className={`mx-auto max-w-lg border border-charcoal/15 bg-white p-5 sm:p-8 text-center shadow-soft ${className}`}
      data-testid="post-payment-success-card"
    >
      {/* 1. Header & Status */}
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/60">
        <CheckCircle2 size={28} />
      </div>

      <p className="mt-4 text-[11px] font-semibold tracking-[0.2em] text-gold uppercase" data-testid="confirmation-eyebrow">
        SOLURE SCENTS • ORDER CONFIRMATION
      </p>

      <h1 className="mt-1 font-display text-2xl sm:text-3xl text-charcoal" data-testid="confirmation-heading">
        Your Order Is Confirmed
      </h1>
      <h2 className="sr-only">Payment Successful — Your Payment Has Been Received</h2>

      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-0.5 text-xs font-semibold text-emerald-800">
        <CheckCircle2 size={12} className="text-emerald-600" />
        <span data-testid="payment-status-badge">PAID — PAYMENT CONFIRMED</span>
      </div>

      <p className="mx-auto mt-2 max-w-sm text-xs text-muted leading-relaxed">
        Thank you for choosing Solure Scents. Your perfume order has been confirmed!
      </p>

      {/* 2. Clean, Compact Order Summary Strip */}
      <div className="mx-auto mt-4 rounded-none border border-charcoal/10 bg-pearl/40 p-3 sm:p-4 text-xs text-left">
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div>
            <span className="text-[10px] text-muted uppercase tracking-wider block">Order Number</span>
            <span className="font-mono text-xs sm:text-sm font-bold text-charcoal tracking-wide" data-testid="order-number-display">
              {orderNumber}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted uppercase tracking-wider block">Amount Paid</span>
            <span className="font-mono text-xs sm:text-sm font-bold text-charcoal" data-testid="amount-paid-display">
              {formatMoney(amountMinor)}
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-charcoal/10 flex flex-wrap items-center justify-between gap-1 text-[11px]">
          <span className="text-muted">Delivery:</span>
          <span
            className="inline-flex items-center gap-1 font-semibold text-amber-800"
            data-testid="delivery-status-badge"
          >
            <Clock size={11} className="text-amber-700" />
            <span>Delivery Arrangement Pending</span>
          </span>
        </div>

        {paymentReference && (
          <div className="mt-1 flex items-center justify-between text-[10px] text-muted">
            <span>Payment Ref:</span>
            <span className="font-mono truncate max-w-[180px] sm:max-w-none">{paymentReference}</span>
          </div>
        )}
      </div>

      {/* 3. Streamlined WhatsApp Delivery Box (Clean, Direct & Mobile-Optimized) */}
      <div className="mx-auto mt-4 rounded-none border border-[#25D366]/30 bg-[#25D366]/5 p-4 text-left">
        <div className="flex items-center gap-1.5">
          <MessageCircle size={15} className="text-[#25D366] shrink-0" />
          <h2 className="font-display text-sm font-semibold text-charcoal">
            Arrange Delivery on WhatsApp
          </h2>
        </div>

        <p className="mt-1 text-xs text-charcoal/80 leading-relaxed">
          To complete your delivery and receive waybill details, please send our team a WhatsApp message using the button below.
        </p>

        {/* 3 Simple Compact Steps */}
        <div className="mt-2.5 grid grid-cols-3 gap-1 text-center text-[10px]">
          <div className="border border-[#25D366]/20 bg-white/90 p-1.5 rounded">
            <span className="font-bold text-[#128C7E] block text-[9px]">01</span>
            <span className="text-charcoal/80">Open WhatsApp</span>
          </div>
          <div className="border border-[#25D366]/20 bg-white/90 p-1.5 rounded">
            <span className="font-bold text-[#128C7E] block text-[9px]">02</span>
            <span className="text-charcoal/80">Send Order ID</span>
          </div>
          <div className="border border-[#25D366]/20 bg-white/90 p-1.5 rounded">
            <span className="font-bold text-[#128C7E] block text-[9px]">03</span>
            <span className="text-charcoal/80">Get Waybill</span>
          </div>
        </div>

        {/* Primary CTA Button */}
        <div className="mt-3">
          <WhatsAppDeliveryButton
            orderNumber={orderNumber}
            paymentReference={paymentReference}
            label="ARRANGE DELIVERY ON WHATSAPP"
          />
        </div>

        <p className="mt-2 text-center text-[10px] text-muted">
          * Delivery fee confirmed separately with concierge.
        </p>
      </div>

      {/* 4. Secondary Action Links */}
      <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
        {orderId && (
          <button
            type="button"
            onClick={() => setShowOrderDetails(!showOrderDetails)}
            className="inline-flex items-center gap-1 border border-charcoal/20 bg-white px-3 py-2 text-[11px] font-semibold text-charcoal uppercase tracking-wider transition hover:border-gold hover:text-gold"
            data-testid="view-order-details-btn"
          >
            <ShoppingBag size={12} className="text-gold" />
            <span>{showOrderDetails ? "Hide Details" : "View Details"}</span>
            {showOrderDetails ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        )}

        {orderId && (
          <DownloadReceiptButton
            orderId={orderId}
            orderNumber={orderNumber}
          />
        )}

        <Link
          href="/shop"
          className="inline-flex items-center gap-1 px-3 py-2 text-[11px] font-semibold text-muted transition hover:text-charcoal hover:underline"
          data-testid="continue-shopping-link"
        >
          <span>Continue Shopping</span>
          <ArrowRight size={11} />
        </Link>
      </div>

      {/* 5. Expandable Order Breakdown */}
      {showOrderDetails && order && (
        <div className="mt-5 text-left transition-all">
          <OrderDetailsSummary
            order={order}
            paymentStatus="Verified via Paystack"
            paymentReference={paymentReference}
            showReceiptDownload={false}
            showWhatsAppCta={false}
            isExpandable={false}
          />
        </div>
      )}

      {showOrderDetails && !order && orderId && (
        <div className="mt-4 text-xs text-muted">
          <Link
            href={`/checkout/confirmation?order_id=${encodeURIComponent(orderId)}&view=details`}
            className="inline-flex items-center gap-1 font-semibold text-charcoal hover:text-gold hover:underline"
          >
            <span>Open Dedicated Order Details</span>
            <ArrowRight size={11} />
          </Link>
        </div>
      )}
    </div>
  );
}
