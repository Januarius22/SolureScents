import type { Metadata } from "next";
import { PaymentCallbackVerifier } from "@/features/payments/components/payment-callback-verifier";

export const metadata: Metadata = {
  title: "Verifying Payment | Solure Scents",
  robots: { index: false, follow: false },
};

export default async function PaymentCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{
    reference?: string;
    trxref?: string;
    order_id?: string;
  }>;
}) {
  const { reference, trxref, order_id } = await searchParams;
  const paymentRef = reference || trxref || null;

  return (
    <div className="min-h-screen bg-ivory/40 pb-24 pt-16 sm:pt-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <PaymentCallbackVerifier
          reference={paymentRef}
          orderId={order_id || null}
        />
      </div>
    </div>
  );
}
