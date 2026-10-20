import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getVerifiedGuestOrder } from "@/features/checkout/services/guest-order-access";
import { getActiveConfirmationAuth } from "@/features/checkout/services/confirmation-session";
import { buttonStyles } from "@/components/ui/button";
import { PaySecurelyButton } from "@/features/payments/components/pay-securely-button";
import { PostPaymentSuccessCard } from "@/features/checkout/components/post-payment-success-card";
import { OrderDetailsSummary } from "@/features/checkout/components/order-details-summary";
import { WhatsAppDeliveryButton } from "@/features/checkout/components/whatsapp-delivery-button";
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Order Confirmation | Solure Scents",
  robots: { index: false, follow: false },
};

function formatMoney(amountMinor: number): string {
  const naira = Math.floor(amountMinor / 100);
  return `₦${naira.toLocaleString("en-NG")}`;
}

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{
    order_id?: string;
    view?: string;
    payment_ref?: string;
  }>;
}) {
  const { order_id, view, payment_ref } = await searchParams;
  const order = await getVerifiedGuestOrder(order_id);

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-28 text-center" data-testid="unauthorized-order-state">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-600">
          <ShieldCheck size={28} />
        </div>
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-red-600 uppercase">
          Security Verification Required
        </p>
        <h1 className="mt-3 font-display text-4xl text-charcoal">Unauthorized Order Access</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted">
          Access to this order requires a valid guest confirmation session. Guest order details are protected to safeguard customer privacy.
        </p>
        <Link href="/shop" className={buttonStyles("primary", "mt-8")}>
          Return to Boutique
        </Link>
      </div>
    );
  }

  // Authoritatively inspect confirmation session & payments table to determine real settlement state
  const authSession = await getActiveConfirmationAuth(order.id);

  const dbClient = createPrivilegedSupabaseClient() ?? (await createServerSupabaseClient());
  let paymentRecord: {
    provider: string;
    provider_reference: string | null;
    status: string;
    amount_minor: number;
    requires_reconciliation?: boolean | null;
    paid_at?: string | null;
    captured_at?: string | null;
  } | null = null;

  try {
    const { data: pay } = await dbClient
      .from("payments")
      .select("provider, provider_reference, status, amount_minor, requires_reconciliation, paid_at, captured_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    paymentRecord = pay;
  } catch {
    // payments table query graceful fallback
  }

  const isOrderPaidStatus = ["confirmed", "processing", "shipped", "delivered"].includes(order.status);
  const isCapturedInLedger = paymentRecord?.status === "captured";
  const isSessionCaptured = authSession?.paymentStatus === "captured";
  const isPaid = isOrderPaidStatus || isCapturedInLedger || isSessionCaptured;

  const isReconciliationRequired =
    Boolean(paymentRecord?.requires_reconciliation) ||
    authSession?.paymentStatus === "reconciliation_required" ||
    (Boolean(payment_ref) && !isPaid);

  const isUnderReview = !isPaid && isReconciliationRequired;

  const paymentReference =
    paymentRecord?.provider_reference ||
    authSession?.paymentReference ||
    payment_ref ||
    null;

  const paymentDate =
    paymentRecord?.paid_at ||
    paymentRecord?.captured_at ||
    authSession?.paidAt ||
    order.createdAt;

  // Dedicated read-only view requested: strictly avoid rendering any payment forms for paid/under-review orders
  const isDedicatedDetailsView = view === "details";

  return (
    <div className="min-h-screen bg-ivory/40 pb-24 pt-10 sm:pt-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Branch 1: Dedicated Order Details View (Task 5: Must never reopen checkout or display Pay Securely for paid orders) */}
        {isDedicatedDetailsView ? (
          <div className="space-y-8">
            <div className="border border-charcoal/15 bg-white p-6 sm:p-8 text-center shadow-soft">
              <Sparkles size={28} className="mx-auto text-gold" />
              <p className="mt-4 text-xs font-semibold tracking-[0.25em] text-gold uppercase" data-testid="details-eyebrow">
                {isPaid
                  ? "SOLURE SCENTS • ORDER BREAKDOWN"
                  : isUnderReview
                    ? "SOLURE SCENTS • CONFIRMATION IN PROGRESS"
                    : "SOLURE SCENTS • ORDER REVIEW"}
              </p>
              <h1 className="mt-2 font-display text-3xl text-charcoal" data-testid="details-heading">
                {isPaid
                  ? `Order Details · ${order.orderNumber}`
                  : isUnderReview
                    ? `Order Details · ${order.orderNumber}`
                    : `Order Review · ${order.orderNumber}`}
              </h1>
              <p className="mt-2 text-xs text-muted max-w-md mx-auto">
                {isPaid
                  ? "Official read-only summary of your confirmed Solure Scents fragrance order."
                  : isUnderReview
                    ? "Your payment was confirmed by Paystack and our concierge is finalizing order records. Please do not make another payment."
                    : "Review your fragrance selection and recipient details below."}
              </p>

              {isPaid && (
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1 text-xs font-semibold text-emerald-800">
                  <ShieldCheck size={13} className="text-emerald-600" />
                  <span>PAID — PAYMENT CONFIRMED</span>
                </div>
              )}

              {isUnderReview && (
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-4 py-1 text-xs font-semibold text-amber-800">
                  <Clock size={13} className="text-amber-700" />
                  <span>PAYMENT RECEIVED — CONFIRMATION IN PROGRESS</span>
                </div>
              )}
            </div>

            {/* Read-Only Multi-Item Order Breakdown */}
            <OrderDetailsSummary
              order={order}
              paymentStatus={
                isPaid
                  ? "PAID — PAYMENT CONFIRMED"
                  : isUnderReview
                    ? "Payment Received — Confirmation in Progress"
                    : "Pending Payment"
              }
              paymentReference={paymentReference}
              paymentDate={paymentDate}
              showReceiptDownload={isPaid}
              showWhatsAppCta={isPaid || isUnderReview}
              isExpandable={false}
            />

            {/* ONLY for genuinely unpaid orders: render payment section */}
            {!isPaid && !isUnderReview && (
              <div className="border border-charcoal/15 bg-white p-8 text-center shadow-soft">
                <h2 className="font-display text-xl text-charcoal">Complete Payment</h2>
                <p className="mt-2 text-xs text-muted max-w-md mx-auto">
                  To reserve your flacons and proceed to delivery dispatch, authorize payment via Paystack:
                </p>
                <div className="mt-6 max-w-md mx-auto">
                  <PaySecurelyButton
                    orderId={order.id}
                    orderNumber={order.orderNumber}
                    amountMinor={order.totalMinor}
                    currency={order.currency}
                  />
                </div>
              </div>
            )}
          </div>
        ) : isPaid ? (
          /* Branch 2: Standard Confirmation Flow — Payment Verified & Order Finalized (State A) */
          <div className="space-y-8">
            <PostPaymentSuccessCard
              orderNumber={order.orderNumber}
              amountMinor={order.totalMinor}
              currency={order.currency}
              orderId={order.id}
              paymentReference={paymentReference}
              order={order}
            />

            {/* Read-Only Multi-Item Order Breakdown Below */}
            <OrderDetailsSummary
              order={order}
              paymentStatus="PAID — PAYMENT CONFIRMED"
              paymentReference={paymentReference}
              paymentDate={paymentDate}
              showReceiptDownload={true}
              showWhatsAppCta={false}
              isExpandable={false}
            />
          </div>
        ) : isUnderReview ? (
          /* Branch 3: Standard Confirmation Flow — Payment Captured, Synchronization Pending (State B) */
          <div className="space-y-8">
            <div
              className="border border-amber-300 bg-amber-50/70 p-8 text-center shadow-soft sm:p-12"
              data-testid="order-under-review-card"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Clock size={32} />
              </div>

              <p className="mt-6 text-xs font-semibold tracking-[0.25em] text-amber-800 uppercase" data-testid="review-eyebrow">
                SOLURE SCENTS • CONFIRMATION IN PROGRESS
              </p>
              <h1 className="mt-2 font-display text-3xl text-charcoal sm:text-4xl" data-testid="review-heading">
                Payment Received — Confirmation in Progress
              </h1>
              <p className="sr-only">Payment Received — Order Under Review</p>

              <div className="mx-auto mt-4 max-w-md rounded-none border border-amber-300/80 bg-white/90 p-4 text-xs leading-relaxed text-amber-950">
                <p className="font-semibold text-charcoal">
                  Your payment has been verified by Paystack, but our system is still finalizing your order. Please do not make another payment.
                </p>
                <p className="mt-2 text-muted">
                  Your funds are secure. Our store administration concierge is finalizing your order records.
                </p>
              </div>

              {/* Reference Badges */}
              <div className="mx-auto mt-6 max-w-md space-y-2 border-y border-amber-200 py-4 text-xs text-left">
                {paymentReference && (
                  <div className="flex justify-between items-center">
                    <span className="text-amber-900 font-medium">Paystack Reference:</span>
                    <span className="font-mono font-bold text-charcoal" data-testid="review-reference">{paymentReference}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-amber-900 font-medium">Order Reference:</span>
                  <span className="font-mono font-bold text-charcoal">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-amber-900 font-medium">Amount Paid:</span>
                  <span className="font-semibold text-charcoal">{formatMoney(order.totalMinor)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-amber-200/60">
                  <span className="text-amber-900 font-medium">Payment Verification:</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <ShieldCheck size={13} className="text-emerald-600" />
                    <span>Confirmed via Paystack</span>
                  </span>
                </div>
              </div>

              {/* WhatsApp Action for Review State */}
              <div className="mt-7 max-w-md mx-auto space-y-3">
                <p className="text-xs text-amber-900 font-medium">
                  Connect with our atelier to complete delivery arrangements:
                </p>
                <WhatsAppDeliveryButton
                  orderNumber={order.orderNumber}
                  paymentReference={paymentReference}
                  label="ARRANGE DELIVERY & FINALIZE ON WHATSAPP"
                />
              </div>

              <div className="mt-6 flex justify-center">
                <Link
                  href={`/checkout/confirmation?order_id=${encodeURIComponent(order.id)}&view=details${paymentReference ? `&payment_ref=${encodeURIComponent(paymentReference)}` : ""}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal hover:underline"
                >
                  View Full Order Breakdown
                </Link>
              </div>
            </div>

            {/* Read-Only Summary without Receipt (receipts only generated for finalized paid orders) */}
            <OrderDetailsSummary
              order={order}
              paymentStatus="Payment Received — Confirmation in Progress"
              paymentReference={paymentReference}
              paymentDate={paymentDate}
              showReceiptDownload={false}
              showWhatsAppCta={false}
              isExpandable={false}
            />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="border border-charcoal/15 bg-white p-8 text-center shadow-soft sm:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold">
                <CheckCircle2 size={32} />
              </div>

              <p className="mt-6 text-xs font-semibold tracking-[0.25em] text-gold uppercase">
                Order Prepared & Pending Payment
              </p>
              <h1 className="mt-2 font-display text-4xl text-charcoal sm:text-5xl">
                Fragrance Order Secured
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-sm text-muted">
                Complete payment to finalize your fragrance order and reserve your flacons.
              </p>

              <div className="mt-6 inline-flex items-center gap-3 border border-charcoal/15 bg-ivory/60 px-5 py-2.5">
                <span className="text-xs text-muted uppercase">Reference:</span>
                <span className="font-mono text-base font-bold tracking-wider text-charcoal">
                  {order.orderNumber}
                </span>
              </div>

              {/* Delivery Policy Disclosure */}
              <div className="mx-auto mt-6 max-w-md rounded-none border border-gold/40 bg-champagne/15 p-4 text-xs text-charcoal/90 text-left">
                <p className="font-semibold text-charcoal">
                  Solure Scents Atelier Delivery Policy:
                </p>
                <p className="mt-1 leading-relaxed text-muted">
                  Your payment covers your perfume purchase only. Delivery fees, where applicable, will be confirmed separately by our team after your order is placed.
                </p>
              </div>

              {/* Paystack Test Payment Section (Only rendered for genuinely unpaid orders!) */}
              <div className="mx-auto mt-6 max-w-md text-left">
                <PaySecurelyButton
                  orderId={order.id}
                  orderNumber={order.orderNumber}
                  amountMinor={order.totalMinor}
                  currency={order.currency}
                />
              </div>
            </div>

            {/* Read-only multi-item breakdown */}
            <OrderDetailsSummary
              order={order}
              paymentStatus="Pending Payment"
              showReceiptDownload={false}
              showWhatsAppCta={false}
              isExpandable={false}
            />
          </div>
        )}


        {/* Global Footer Navigation */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-xs">
          <Link href="/shop" className={buttonStyles("primary")}>
            {isPaid ? "Explore More Fragrances" : "Explore More Fragrances"}
          </Link>
          {!isPaid && !isUnderReview && (
            <Link href="/cart" className={buttonStyles("secondary")}>
              Return to Cart
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
