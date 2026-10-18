import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  Truck,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { getVerifiedGuestOrder } from "@/features/checkout/services/guest-order-access";
import { buttonStyles } from "@/components/ui/button";
import { PaySecurelyButton } from "@/features/payments/components/pay-securely-button";

export const metadata: Metadata = {
  title: "Order Preparation Confirmation | Solure Scents",
  robots: { index: false, follow: false },
};

function formatMoney(amountMinor: number): string {
  const naira = Math.floor(amountMinor / 100);
  return `₦${naira.toLocaleString("en-NG")}`;
}

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const { order_id } = await searchParams;
  const order = await getVerifiedGuestOrder(order_id);

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-28 text-center">
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

  const isPaid = ["confirmed", "processing", "shipped", "delivered"].includes(order.status);

  return (
    <div className="min-h-screen bg-ivory/40 pb-24 pt-12 sm:pt-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Status Notification */}
        <div className="border border-charcoal/15 bg-white p-8 text-center shadow-soft sm:p-12">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            isPaid ? "bg-emerald-50 text-emerald-600" : "bg-gold/15 text-gold"
          }`}>
            <CheckCircle2 size={32} />
          </div>

          <p className="mt-6 text-xs font-semibold tracking-[0.25em] text-gold uppercase">
            {isPaid ? "Payment Verified & Order Confirmed" : "Order Prepared & Pending Payment"}
          </p>
          <h1 className="mt-2 font-display text-4xl text-charcoal sm:text-5xl">
            {isPaid ? "Your Scent Journey Has Begun" : "Fragrance Order Secured"}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted">
            {isPaid
              ? "Your payment has been verified with Paystack. Our artisan atelier is preparing your flacons."
              : "Complete payment to finalize your fragrance order and reserve your flacons."}
          </p>

          <div className="mt-6 inline-flex items-center gap-3 border border-charcoal/15 bg-ivory/60 px-5 py-2.5">
            <span className="text-xs text-muted uppercase">Reference:</span>
            <span className="font-mono text-base font-bold tracking-wider text-charcoal">
              {order.orderNumber}
            </span>
          </div>

          {/* Paystack Test Payment Section */}
          <div className="mx-auto mt-8 max-w-md text-left">
            {!isPaid ? (
              <PaySecurelyButton
                orderId={order.id}
                orderNumber={order.orderNumber}
                amountMinor={order.totalMinor}
                currency={order.currency}
              />
            ) : (
              <div className="flex items-center justify-center gap-2 border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-900">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Payment captured successfully. Receipt sent to {order.customerEmail}.</span>
              </div>
            )}
          </div>
        </div>

        {/* Order Details Grid */}
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Left Column: Delivery Destination */}
          <div className="border border-charcoal/10 bg-white p-6 sm:p-8">
            <div className="flex items-center gap-2 border-b border-charcoal/10 pb-4">
              <MapPin size={16} className="text-gold" />
              <h2 className="font-display text-lg text-charcoal">Delivery Destination</h2>
            </div>

            <div className="mt-5 space-y-3 text-xs leading-relaxed text-charcoal/80">
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
              <div className="border-t border-charcoal/10 pt-3">
                <p className="font-semibold text-charcoal">Address:</p>
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

              {order.shippingAddress.deliveryNotice && (
                <div className="mt-4 flex items-start gap-2 rounded bg-ivory p-3 text-[11px] text-muted">
                  <Truck size={14} className="mt-0.5 shrink-0 text-gold" />
                  <span>{order.shippingAddress.deliveryNotice}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Line Items & Totals */}
          <div className="border border-charcoal/10 bg-white p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-charcoal/10 pb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-gold" />
                <h2 className="font-display text-lg text-charcoal">Order Items</h2>
              </div>
              <span className="text-xs text-muted">
                {order.items.reduce((s, i) => s + i.quantity, 0)} flacons
              </span>
            </div>

            <div className="mt-5 divide-y divide-charcoal/10">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between py-3 text-xs">
                  <div>
                    <p className="font-semibold text-charcoal">{item.productName}</p>
                    <p className="text-muted">
                      {item.variantLabel} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right font-mono font-medium text-charcoal">
                    {formatMoney(item.lineTotalMinor)}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2 border-t border-charcoal/10 pt-4 text-xs">
              <div className="flex justify-between text-muted">
                <span>Bag Subtotal</span>
                <span className="font-mono text-charcoal">{formatMoney(order.subtotalMinor)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Delivery Service</span>
                <span className="font-mono text-charcoal">
                  {order.deliveryStatus === "free" ? (
                    <span className="text-emerald-700">₦0 (Complimentary)</span>
                  ) : order.deliveryStatus === "configured" && order.shippingMinor !== null ? (
                    formatMoney(order.shippingMinor)
                  ) : (
                    <span className="font-sans text-[11px] text-amber-800">
                      Calculated prior to dispatch
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-baseline justify-between border-t border-charcoal/15 pt-3 text-sm">
                <div>
                  <span className="font-semibold text-charcoal">
                    {order.isTotalSettled ? "Settled Total" : "Product Subtotal"}
                  </span>
                  {!order.isTotalSettled && (
                    <p className="text-[10px] text-muted">
                      Excludes courier dispatch fee (quoted separately prior to shipment)
                    </p>
                  )}
                </div>
                <span className="font-display text-lg font-bold text-charcoal">
                  {formatMoney(order.totalMinor)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/shop" className={buttonStyles("primary")}>
            Explore More Fragrances
          </Link>
          <Link href="/cart" className={buttonStyles("secondary")}>
            Return to Cart
          </Link>
        </div>
      </div>
    </div>
  );
}
