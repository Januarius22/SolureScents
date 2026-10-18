"use client";

import { useState } from "react";
import { CreditCard, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { initializePaymentAction } from "../actions/payment-actions";

interface PaySecurelyButtonProps {
  orderId: string;
  orderNumber: string;
  amountMinor: number;
  currency?: string;
}

export function PaySecurelyButton({
  orderId,
  orderNumber,
  amountMinor,
  currency = "NGN",
}: PaySecurelyButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedAmount = `₦${Math.floor(amountMinor / 100).toLocaleString("en-NG")}`;

  const handlePayment = async () => {
    setIsPending(true);
    setError(null);

    try {
      const result = await initializePaymentAction(orderId);

      if (!result.success || !result.redirectUrl) {
        setError(
          result.error ??
            "Unable to connect to Paystack. If test credentials are not configured, external payment is blocked.",
        );
        setIsPending(false);
        return;
      }

      // Redirect customer to Paystack Test Checkout
      window.location.href = result.redirectUrl;
    } catch (err) {
      console.error("Payment trigger error:", err);
      setError("An unexpected error occurred while initiating payment. Please try again.");
      setIsPending(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Test Mode Notice Banner */}
      <div className="flex items-center justify-between border border-amber-300/80 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-amber-700" />
          <span className="font-semibold tracking-wide uppercase text-[10px]">
            Paystack Test Environment
          </span>
        </div>
        <span className="font-mono text-[11px] text-amber-800">{orderNumber} · {currency} Sandbox</span>
      </div>

      {/* Error Message if payment initiation fails */}
      {error && (
        <div className="flex items-start gap-2.5 border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="font-semibold text-rose-900">Payment Could Not Proceed</p>
            <p className="mt-0.5 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Main Pay Securely Action Button */}
      <button
        type="button"
        disabled={isPending}
        onClick={handlePayment}
        className="group relative flex w-full items-center justify-center gap-3 bg-charcoal px-8 py-4 text-xs font-semibold tracking-[0.2em] text-pearl uppercase shadow-lg transition-all hover:bg-gold hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 size={16} className="animate-spin text-pearl group-hover:text-charcoal" />
            <span>Connecting to Paystack...</span>
          </>
        ) : (
          <>
            <CreditCard size={16} className="text-gold transition-colors group-hover:text-charcoal" />
            <span>Pay Securely · {formattedAmount}</span>
          </>
        )}
      </button>

      <p className="text-center text-[10px] text-muted">
        Transactions are encrypted using 256-bit SSL. Test card numbers and simulation are supported.
      </p>
    </div>
  );
}
