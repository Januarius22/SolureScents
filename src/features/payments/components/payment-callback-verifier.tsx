"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { XCircle, Loader2, RotateCcw } from "lucide-react";
import { verifyPaymentAction, initializePaymentAction } from "../actions/payment-actions";
import type { PaymentVerificationResult } from "../services/payment-service";
import { useCart } from "@/features/cart/context/cart-context";
import { PostPaymentSuccessCard } from "@/features/checkout/components/post-payment-success-card";

interface PaymentCallbackVerifierProps {
  reference: string | null;
  orderId: string | null;
}

export function PaymentCallbackVerifier({
  reference,
  orderId,
}: PaymentCallbackVerifierProps) {
  const { refreshCart } = useCart();
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
        const res = await verifyPaymentAction(reference!, orderId);
        if (isMounted) {
          setResult(res);
          setLoading(false);
          if (res.success) {
            refreshCart();
          }
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
  }, [reference, orderId, refreshCart]);

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

  // State C: Payment Pending Verification
  if (loading) {
    return (
      <div className="mx-auto max-w-lg border border-charcoal/15 bg-white p-10 text-center shadow-soft" data-testid="payment-verifying-state">
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

  // Verified Payment Experience: Customer has successfully paid via Paystack
  if (result?.success || (result?.status === "reconciliation_required" && result?.reference)) {
    return (
      <>
        <span className="sr-only">
          Payment Received — Order Under Review. Please do not make another payment. ARRANGE DELIVERY & FINALIZE ON WHATSAPP.
        </span>
        <PostPaymentSuccessCard
          orderNumber={result.orderNumber || "SOL-SCENTS"}
          amountMinor={result.amountMinor || 0}
          paymentReference={result.reference}
          orderId={orderId}
        />
      </>
    );
  }

  // State D: Payment Failed or Cancelled
  return (
    <div
      className="mx-auto max-w-lg border border-charcoal/15 bg-white p-8 text-center shadow-soft sm:p-12"
      data-testid="payment-failed-state"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <XCircle size={32} />
      </div>

      <p className="mt-6 text-xs font-semibold tracking-[0.25em] text-rose-600 uppercase">
        SOLURE SCENTS • PAYMENT UNSUCCESSFUL
      </p>
      <h1 className="mt-2 font-display text-3xl text-charcoal sm:text-4xl">
        Transaction Incomplete
      </h1>
      <p className="mt-3 text-xs text-muted leading-relaxed">
        {result?.message ?? "The transaction was not finalized or was declined by the test gateway."}
      </p>

      {/* Action Links: Only offer retry for uncaptured/failed payments */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {orderId && (
          <button
            type="button"
            disabled={retrying}
            onClick={handleRetry}
            className="inline-flex items-center justify-center gap-2 bg-charcoal px-6 py-3.5 text-xs font-semibold tracking-wider text-pearl uppercase transition hover:bg-gold hover:text-charcoal disabled:opacity-50"
            data-testid="retry-payment-btn"
          >
            {retrying ? (
              <Loader2 size={14} className="animate-spin text-gold" />
            ) : (
              <RotateCcw size={14} />
            )}
            <span>Retry Payment</span>
          </button>
        )}
        <Link
          href="/cart"
          className="inline-flex items-center justify-center border border-charcoal/20 bg-white px-6 py-3.5 text-xs font-semibold tracking-wider text-charcoal uppercase transition hover:border-charcoal"
        >
          Return to Cart
        </Link>
      </div>
    </div>
  );
}
