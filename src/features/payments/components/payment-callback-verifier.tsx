"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, ArrowRight, RotateCcw, Clock } from "lucide-react";
import { verifyPaymentAction, initializePaymentAction } from "../actions/payment-actions";
import type { PaymentVerificationResult } from "../services/payment-service";

interface PaymentCallbackVerifierProps {
  reference: string | null;
  orderId: string | null;
}

export function PaymentCallbackVerifier({
  reference,
  orderId,
}: PaymentCallbackVerifierProps) {
  const [loading, setLoading] = useState(Boolean(reference));
  const [retrying, setRetrying] = useState(false);
  const [result, setResult] = useState<PaymentVerificationResult | null>(
    reference
      ? null
      : {
          success: false,
          status: "failed",
          message: "No Paystack payment reference found in verification callback.",
        },
  );

  useEffect(() => {
    if (!reference) {
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        const res = await verifyPaymentAction(reference!);
        if (isMounted) {
          setResult(res);
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setResult({
            success: false,
            status: "failed",
            message: "An unexpected error occurred while verifying the transaction with Paystack.",
          });
          setLoading(false);
        }
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [reference]);

  const handleRetry = async () => {
    if (!orderId) return;
    setRetrying(true);
    try {
      const initRes = await initializePaymentAction(orderId);
      if (initRes.success && initRes.redirectUrl) {
        window.location.href = initRes.redirectUrl;
      } else {
        alert(initRes.error || "Unable to restart payment session.");
        setRetrying(false);
      }
    } catch {
      alert("Failed to reconnect to payment gateway.");
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg border border-charcoal/15 bg-white p-10 text-center shadow-soft">
        <Loader2 size={36} className="mx-auto animate-spin text-gold" />
        <h2 className="mt-6 font-display text-2xl text-charcoal">
          Verifying Transaction
        </h2>
        <p className="mt-2 text-xs text-muted leading-relaxed">
          Inquiring with Paystack to confirm authoritative payment settlement. Please do not close this window.
        </p>
      </div>
    );
  }

  if (result?.success) {
    const formattedAmount = result.amountMinor
      ? `₦${Math.floor(result.amountMinor / 100).toLocaleString("en-NG")}`
      : "";

    return (
      <div className="mx-auto max-w-lg border border-charcoal/15 bg-white p-8 text-center shadow-soft sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={32} />
        </div>

        <p className="mt-6 text-xs font-semibold tracking-[0.25em] text-gold uppercase">
          Payment Verified
        </p>
        <h1 className="mt-2 font-display text-3xl text-charcoal sm:text-4xl">
          Order Confirmed & Secured
        </h1>
        <p className="mt-3 text-xs text-muted leading-relaxed">
          Your payment was authoritatively verified through Paystack Test Gateway. Your composition is now moving into our artisan packaging atelier.
        </p>

        {/* Reference Badges */}
        <div className="mt-6 space-y-2 border-y border-charcoal/10 py-4 text-xs text-left">
          {result.orderNumber && (
            <div className="flex justify-between">
              <span className="text-muted">Order Number:</span>
              <span className="font-mono font-bold text-charcoal">{result.orderNumber}</span>
            </div>
          )}
          {result.reference && (
            <div className="flex justify-between">
              <span className="text-muted">Paystack Reference:</span>
              <span className="font-mono text-charcoal">{result.reference}</span>
            </div>
          )}
          {formattedAmount && (
            <div className="flex justify-between">
              <span className="text-muted">Amount Paid:</span>
              <span className="font-semibold text-charcoal">{formattedAmount}</span>
            </div>
          )}
        </div>

        {/* Action Links */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {orderId && (
            <Link
              href={`/checkout/confirmation?order_id=${orderId}`}
              className="inline-flex items-center justify-center gap-2 bg-charcoal px-6 py-3 text-xs font-semibold tracking-wider text-pearl uppercase transition hover:bg-gold hover:text-charcoal"
            >
              <span>View Order Details</span>
              <ArrowRight size={14} />
            </Link>
          )}
          <Link
            href="/shop"
            className="border border-charcoal/20 bg-white px-6 py-3 text-xs font-semibold tracking-wider text-charcoal uppercase transition hover:border-charcoal"
          >
            Explore More
          </Link>
        </div>
      </div>
    );
  }

  if (result?.status === "reconciliation_required") {
    const formattedAmount = result.amountMinor
      ? `₦${Math.floor(result.amountMinor / 100).toLocaleString("en-NG")}`
      : "";

    return (
      <div className="mx-auto max-w-lg border border-amber-300 bg-amber-50/70 p-8 text-center shadow-soft sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Clock size={32} />
        </div>

        <p className="mt-6 text-xs font-semibold tracking-[0.25em] text-amber-800 uppercase">
          Payment Captured · Pending Synchronization
        </p>
        <h1 className="mt-2 font-display text-3xl text-charcoal sm:text-4xl">
          Order Under Review
        </h1>
        <p className="mt-3 text-xs text-amber-950 leading-relaxed">
          Your payment was successfully charged and verified by Paystack. However, atomic automated database fulfillment is currently pending. Your funds are secure — <strong>please do NOT pay again</strong>.
        </p>

        {/* Reference Badges */}
        <div className="mt-6 space-y-2 border-y border-amber-200 py-4 text-xs text-left">
          {result.reference && (
            <div className="flex justify-between">
              <span className="text-amber-800 font-medium">Paystack Reference:</span>
              <span className="font-mono font-bold text-charcoal">{result.reference}</span>
            </div>
          )}
          {formattedAmount && (
            <div className="flex justify-between">
              <span className="text-amber-800 font-medium">Verified Amount:</span>
              <span className="font-semibold text-charcoal">{formattedAmount}</span>
            </div>
          )}
        </div>

        <p className="mt-4 text-[11px] text-amber-800">
          Our store administration concierge has been flagged with your reference to finalize your order fulfillment.
        </p>

        {/* Action Links (No Retry Button to prevent double-charging!) */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {orderId && (
            <Link
              href={`/checkout/confirmation?order_id=${orderId}`}
              className="inline-flex items-center justify-center gap-2 bg-charcoal px-6 py-3 text-xs font-semibold tracking-wider text-pearl uppercase transition hover:bg-gold hover:text-charcoal"
            >
              <span>View Order Details</span>
              <ArrowRight size={14} />
            </Link>
          )}
          <Link
            href="/contact"
            className="border border-charcoal/20 bg-white px-6 py-3 text-xs font-semibold tracking-wider text-charcoal uppercase transition hover:border-charcoal"
          >
            Contact Concierge
          </Link>
        </div>
      </div>
    );
  }

  // Failed state
  return (
    <div className="mx-auto max-w-lg border border-charcoal/15 bg-white p-8 text-center shadow-soft sm:p-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <XCircle size={32} />
      </div>

      <p className="mt-6 text-xs font-semibold tracking-[0.25em] text-rose-600 uppercase">
        Payment Unsuccessful
      </p>
      <h1 className="mt-2 font-display text-3xl text-charcoal sm:text-4xl">
        Transaction Incomplete
      </h1>
      <p className="mt-3 text-xs text-muted leading-relaxed">
        {result?.message ?? "The transaction was not finalized or was declined by the test gateway."}
      </p>

      {/* Action Links */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {orderId && (
          <button
            type="button"
            disabled={retrying}
            onClick={handleRetry}
            className="inline-flex items-center justify-center gap-2 bg-charcoal px-6 py-3 text-xs font-semibold tracking-wider text-pearl uppercase transition hover:bg-gold hover:text-charcoal disabled:opacity-50"
          >
            {retrying ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RotateCcw size={14} />
            )}
            <span>Retry Payment</span>
          </button>
        )}
        <Link
          href="/cart"
          className="border border-charcoal/20 bg-white px-6 py-3 text-xs font-semibold tracking-wider text-charcoal uppercase transition hover:border-charcoal"
        >
          Return to Cart
        </Link>
      </div>
    </div>
  );
}
