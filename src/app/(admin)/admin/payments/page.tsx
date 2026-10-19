import {
  AccountHeader,
  Empty,
  Money,
  Panel,
  buttonClass,
  inputClass,
} from "@/components/account/account-ui";
import { preparePayment } from "@/features/admin/actions/commerce-operations";
import { getCommerceOperations } from "@/features/admin/services/commerce-operations";
import { paystackGateway } from "@/features/payments/services/paystack-gateway";
import { ShieldCheck, AlertCircle } from "lucide-react";

import { AdminPagination } from "@/features/admin/components/admin-pagination";

export const metadata = {
  title: "Payment Operations & Ledger | Solure Scents Admin",
};

export default async function Page({
  searchParams,
}: PageProps<"/admin/payments">) {
  const params = await searchParams;
  const rawPage = typeof params.page === "string" ? params.page : undefined;
  const page =
    rawPage && !Number.isNaN(Number(rawPage)) && Number(rawPage) > 0
      ? Math.floor(Number(rawPage))
      : 1;

  const pageSize = 10;
  const d = await getCommerceOperations();
  const orderMap = new Map(d.orders.map((o) => [o.id, o]));
  const isPaystackConfigured = paystackGateway.isConfigured();

  const totalCount = d.payments.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const validPage = Math.max(1, Math.min(page, totalPages || 1));
  const pagedPayments = d.payments.slice(
    (validPage - 1) * pageSize,
    validPage * pageSize,
  );

  return (
    <div className="space-y-6">
      <AccountHeader
        eyebrow="Payment Intelligence & Audits"
        title="Payments Ledger"
        copy="Audit Paystack test gateway transactions and offline payment records with complete ledger traceability."
      />

      {/* Paystack Test Gateway Status Indicator */}
      <div
        className={`flex items-center justify-between border p-4 text-xs ${
          isPaystackConfigured
            ? "border-emerald-300 bg-emerald-50 text-emerald-950"
            : "border-amber-300 bg-amber-50 text-amber-950"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isPaystackConfigured ? (
            <ShieldCheck size={18} className="text-emerald-700 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-amber-700 shrink-0" />
          )}
          <div>
            <p className="font-semibold uppercase tracking-wider text-[11px]">
              {isPaystackConfigured
                ? "Paystack Test Gateway Connected (Sandbox Active)"
                : "Paystack Gateway: Pending Test Credentials"}
            </p>
            <p className="mt-0.5 text-muted">
              {isPaystackConfigured
                ? "Transactions are processed strictly in TEST MODE (sk_test_...). No real bank cards are charged."
                : "PAYSTACK_SECRET_KEY is not configured in .env.local. Test transactions are ready once configured."}
            </p>
          </div>
        </div>
        <span className="font-mono text-[11px] font-semibold uppercase">
          {isPaystackConfigured ? "Test Mode" : "Pending Keys"}
        </span>
      </div>

      {/* Offline / Manual Record Form */}
      <Panel title="Record Offline / Manual Settlement">
        <form action={preparePayment} className="grid gap-3 sm:grid-cols-[1fr_12rem_1fr_auto]">
          <select aria-label="Order" className={inputClass} name="order" required defaultValue="">
            <option disabled value="">
              Select order
            </option>
            {d.orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_number} · {o.currency} {o.total_minor / 100}
              </option>
            ))}
          </select>

          <select
            aria-label="Provider"
            className={inputClass}
            name="provider"
            defaultValue="bank_transfer"
          >
            <option value="paystack">Paystack (Test)</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="cash_on_delivery">Cash on delivery</option>
            <option value="manual_invoice">Manual invoice</option>
          </select>

          <input
            aria-label="Reference"
            className={inputClass}
            name="reference"
            placeholder="Payment reference (optional)"
          />

          <button className={buttonClass} type="submit">
            Record
          </button>
        </form>
      </Panel>

      {/* Payment Ledger */}
      <Panel title={`Payment Ledger (${d.payments.length} Transactions)`}>
        {d.payments.length ? (
          <div className="divide-y divide-charcoal/10">
            {pagedPayments.map((p) => {
              const o = orderMap.get(p.order_id);
              const isCaptured = p.status === "captured";
              const isPending = p.status === "pending";

              return (
                <div
                  className="grid gap-3 py-4 text-xs sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center"
                  key={p.id}
                >
                  <div>
                    <span className="font-mono font-bold text-charcoal">
                      {o?.order_number ?? "Order Reference"}
                    </span>
                    <small className="block text-muted">
                      Customer: {o?.customer_email ?? "Guest"}
                    </small>
                  </div>

                  <div>
                    <span className="font-semibold text-charcoal uppercase tracking-wider text-[11px]">
                      {p.provider === "paystack" ? "Paystack (Test)" : p.provider.replaceAll("_", " ")}
                    </span>
                    <span className="block font-mono text-[10px] text-muted truncate max-w-[200px]">
                      Ref: {p.provider_reference ?? "None"}
                    </span>
                  </div>

                  <div>
                    <span
                      className={`inline-block border px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        isCaptured
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : isPending
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : "border-rose-300 bg-rose-50 text-rose-800"
                      }`}
                    >
                      {p.status.replaceAll("_", " ")}
                    </span>
                    <span className="block text-[10px] text-muted mt-0.5">
                      {new Date(p.created_at).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="text-right font-display text-base font-bold text-charcoal sm:text-right">
                    <Money amount={p.amount_minor} currency={p.currency} />
                  </div>
                </div>
              );
            })}
            <AdminPagination
              currentPage={validPage}
              pageSize={pageSize}
              totalCount={totalCount}
              baseUrl="/admin/payments"
              searchParams={{}}
              itemLabel="transactions"
            />
          </div>
        ) : (
          <Empty>No payment records have been registered in the ledger.</Empty>
        )}
      </Panel>
    </div>
  );
}
