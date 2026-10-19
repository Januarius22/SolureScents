"use client";

import Link from "next/link";
import { CheckCircle2, Clock, ShieldCheck, ArrowRight } from "lucide-react";
import { WhatsAppDeliveryButton } from "./whatsapp-delivery-button";

interface PostPaymentSuccessCardProps {
  orderNumber: string;
  amountMinor: number;
  currency?: string;
  orderId?: string | null;
  paymentReference?: string | null;
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
  className = "",
}: PostPaymentSuccessCardProps) {
  return (
    <div
      className={`border border-charcoal/15 bg-white p-8 text-center shadow-soft sm:p-12 ${className}`}
      data-testid="post-payment-success-card"
    >
      {/* 1. Payment Successful Confirmation Heading */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
        <CheckCircle2 size={34} />
      </div>

      <p className="mt-6 text-xs font-semibold tracking-[0.25em] text-gold uppercase">
        Payment Successful
      </p>

      <h1 className="mt-2 font-display text-3xl text-charcoal sm:text-4xl">
        Your Scent Journey Has Begun
      </h1>

      <p className="mx-auto mt-3 max-w-lg text-sm text-charcoal/80 font-medium leading-relaxed">
        Your perfume order has been confirmed!
      </p>

      {/* 2. Actual Order Number & Amount Paid & 3. Delivery Status */}
      <div className="mx-auto mt-6 max-w-md border-y border-charcoal/10 py-4 text-xs text-left space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-muted">Order Number:</span>
          <span className="font-mono text-sm font-bold tracking-wider text-charcoal" data-testid="order-number-display">
            {orderNumber}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted">Amount Paid (Perfumes Only):</span>
          <span className="font-mono text-sm font-bold text-charcoal" data-testid="amount-paid-display">
            {formatMoney(amountMinor)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted">Payment Verification:</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Verified via Paystack</span>
          </span>
        </div>

        {paymentReference && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted">Transaction Ref:</span>
            <span className="font-mono text-muted/90">{paymentReference}</span>
          </div>
        )}

        {/* 3. Delivery Arrangement Pending Status Badge */}
        <div className="flex items-center justify-between border-t border-charcoal/10 pt-2.5">
          <span className="text-muted">Delivery Status:</span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-amber-900 uppercase"
            data-testid="delivery-status-badge"
          >
            <Clock size={12} className="text-amber-700" />
            <span>Delivery Arrangement Pending</span>
          </span>
        </div>
      </div>

      {/* Main Instruction Callout */}
      <div className="mx-auto mt-6 max-w-md rounded-none border border-gold/40 bg-champagne/15 p-5 text-left text-xs leading-relaxed text-charcoal/90">
        <p className="font-semibold text-charcoal text-[13px]">
          Next Step: Confirm Dispatch with Our Atelier
        </p>
        <p className="mt-1.5 text-muted leading-relaxed">
          To arrange delivery, please send our team a WhatsApp message using the button below. Your order number has already been included in the message for your convenience.
        </p>
        <p className="mt-2 text-[11px] text-muted italic">
          Your payment covers your perfume purchase only. Delivery fees, where applicable, will be confirmed separately by our team after your order is placed.
        </p>
      </div>

      {/* 4. Prominent Primary CTA: Arrange Delivery on WhatsApp */}
      <div className="mx-auto mt-6 max-w-md">
        <WhatsAppDeliveryButton orderNumber={orderNumber} />
      </div>

      {/* 5. Secondary Action: Continue Shopping */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs">
        {orderId && (
          <Link
            href={`/checkout/confirmation?order_id=${encodeURIComponent(orderId)}`}
            className="inline-flex items-center gap-1.5 text-charcoal font-medium transition hover:text-gold hover:underline"
          >
            <span>View Full Order Details</span>
            <ArrowRight size={13} />
          </Link>
        )}
        <span className="text-charcoal/20">|</span>
        <Link
          href="/shop"
          className="text-muted transition hover:text-charcoal hover:underline"
          data-testid="continue-shopping-link"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
