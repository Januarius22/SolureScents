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
import { PaymentFiltersToolbar } from "@/features/admin/components/payment-filters-toolbar";
import { matchesDateWindow } from "@/features/admin/utils/date-range";

export const metadata = {
  title: "Payment Operations & Ledger | Solure Scents Admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
    provider?: string;
    sort?: string;
    dateRange?: string;
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  // Pagination parameters
  const rawPage = typeof params.page === "string" ? params.page : undefined;
  const page =
    rawPage && !Number.isNaN(Number(rawPage)) && Number(rawPage) > 0
      ? Math.floor(Number(rawPage))
      : 1;

  const rawPageSize = typeof params.pageSize === "string" ? params.pageSize : undefined;
  const pageSize =
    rawPageSize && [10, 20, 50].includes(Number(rawPageSize))
      ? Number(rawPageSize)
      : 10; // Default: pageSize = 10

  // Filters & sorting parameters
  const searchQuery = params.search?.trim().toLowerCase() ?? "";
  const statusFilter = params.status ?? "all";
  const providerFilter = params.provider ?? "all";
  const sortOption = params.sort ?? "newest";
  const dateRangeOption = params.dateRange ?? "all";

  const d = await getCommerceOperations();
  const orderMap = new Map(d.orders.map((o) => [o.id, o]));
  const isPaystackConfigured = paystackGateway.isConfigured();

  // Filter raw payments
  const filteredPayments = d.payments.filter((p) => {
    const o = orderMap.get(p.order_id);
    const orderNumber = o?.order_number?.toLowerCase() ?? "";
    const customerEmail = (p.customer_email ?? o?.customer_email ?? "").toLowerCase();
    const reference = (p.provider_reference ?? "").toLowerCase();

    // Check search term
    if (searchQuery) {
      const matchSearch =
        orderNumber.includes(searchQuery) ||
        customerEmail.includes(searchQuery) ||
        reference.includes(searchQuery);
      if (!matchSearch) return false;
    }

    // Check status
    if (statusFilter !== "all" && p.status !== statusFilter) {
      return false;
    }

    // Check provider
    if (providerFilter !== "all" && p.provider !== providerFilter) {
      return false;
    }

    // Check date range
    if (!matchesDateWindow(p.created_at, dateRangeOption)) {
      return false;
    }

    return true;
  });

  // Sort filtered payments
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    if (sortOption === "oldest") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (sortOption === "highest") {
      return b.amount_minor - a.amount_minor;
    }
    if (sortOption === "lowest") {
      return a.amount_minor - b.amount_minor;
    }
    // Default: newest
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const totalCount = sortedPayments.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const validPage = Math.max(1, Math.min(page, totalPages || 1));
  const pagedPayments = sortedPayments.slice(
    (validPage - 1) * pageSize,
    validPage * pageSize,
  );

  // Prepare safe CSV export data (no sensitive user data)
  const exportData = sortedPayments.map((p) => {
    const o = orderMap.get(p.order_id);
    return {
      orderNumber: o?.order_number ?? "Direct",
      customerEmail: p.customer_email ?? o?.customer_email ?? "Guest",
      reference: p.provider_reference ?? p.id,
      provider: p.provider,
      status: p.status,
      amountMinor: p.amount_minor,
      currency: p.currency,
      createdAt: p.created_at,
    };
  });

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

      {/* Task 6: Search & Filters Toolbar */}
      <PaymentFiltersToolbar
        currentSearch={params.search}
        currentStatus={params.status}
        currentProvider={params.provider}
        currentSort={params.sort}
        currentDateRange={params.dateRange}
        exportData={exportData}
      />

      {/* Task 4 & 5: Scrollable Payment Ledger Table with Sticky Header */}
      <Panel title={`Payment Ledger (${totalCount} Filtered Transactions)`}>
        {sortedPayments.length ? (
          <div>
            {/* Scrollable Container with Controlled Maximum Height & Sticky Header */}
            <div className="overflow-x-auto overflow-y-auto max-h-[580px] border border-charcoal/10 rounded">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-charcoal/15 bg-white shadow-xs">
                  <tr className="text-muted uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 font-semibold">Order / Customer</th>
                    <th className="py-3 px-4 font-semibold">Gateway & Reference</th>
                    <th className="py-3 px-4 font-semibold">Status & Date</th>
                    <th className="py-3 px-4 font-semibold text-right">Captured Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal/10">
                  {pagedPayments.map((p) => {
                    const o = orderMap.get(p.order_id);
                    const isCaptured = p.status === "captured";
                    const isPending = p.status === "pending";

                    return (
                      <tr key={p.id} className="hover:bg-ivory/50 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-charcoal">
                          <span className="font-mono font-bold block text-sm">
                            {o?.order_number ?? "Order Direct"}
                          </span>
                          <span className="text-muted text-[11px] block mt-0.5">
                            Customer: {p.customer_email ?? o?.customer_email ?? "Guest"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-charcoal uppercase tracking-wider text-[11px] block">
                            {p.provider === "paystack"
                              ? "Paystack (Test)"
                              : p.provider.replaceAll("_", " ")}
                          </span>
                          <span className="font-mono text-[11px] text-muted truncate max-w-[220px] block mt-0.5">
                            Ref: {p.provider_reference ?? "None"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
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
                          <span className="block text-[11px] text-muted mt-1">
                            {new Date(p.created_at).toLocaleDateString("en-NG", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-display text-base font-bold text-charcoal">
                          <Money amount={p.amount_minor} currency={p.currency} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls with 10 / 20 / 50 selector */}
            <AdminPagination
              currentPage={validPage}
              pageSize={pageSize}
              totalCount={totalCount}
              baseUrl="/admin/payments"
              searchParams={{
                search: params.search,
                status: params.status,
                provider: params.provider,
                sort: params.sort,
                dateRange: params.dateRange,
              }}
              itemLabel="transactions"
            />
          </div>
        ) : (
          <Empty>
            {d.payments.length === 0
              ? "No payment records have been registered in the ledger."
              : "No transactions match your current search and filter criteria. Click 'Reset' to view all records."}
          </Empty>
        )}
      </Panel>
    </div>
  );
}
