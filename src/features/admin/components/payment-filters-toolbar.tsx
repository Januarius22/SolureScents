"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, RotateCcw, Download } from "lucide-react";

interface ExportablePayment {
  orderNumber: string;
  customerEmail: string;
  reference: string;
  provider: string;
  status: string;
  amountMinor: number;
  currency: string;
  createdAt: string;
}

interface PaymentFiltersToolbarProps {
  currentSearch?: string;
  currentStatus?: string;
  currentProvider?: string;
  currentSort?: string;
  currentDateRange?: string;
  exportData: ExportablePayment[];
}

export function PaymentFiltersToolbar({
  currentSearch = "",
  currentStatus = "all",
  currentProvider = "all",
  currentSort = "newest",
  currentDateRange = "all",
  exportData,
}: PaymentFiltersToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(currentSearch);
  const [status, setStatus] = useState(currentStatus);
  const [provider, setProvider] = useState(currentProvider);
  const [sort, setSort] = useState(currentSort);
  const [dateRange, setDateRange] = useState(currentDateRange);

  const applyFilters = (updates: {
    search?: string;
    status?: string;
    provider?: string;
    sort?: string;
    dateRange?: string;
  }) => {
    const sp = new URLSearchParams(searchParams.toString());

    // When filters change, reset page to 1
    sp.delete("page");

    const newSearch = updates.search !== undefined ? updates.search : search;
    const newStatus = updates.status !== undefined ? updates.status : status;
    const newProvider = updates.provider !== undefined ? updates.provider : provider;
    const newSort = updates.sort !== undefined ? updates.sort : sort;
    const newDateRange = updates.dateRange !== undefined ? updates.dateRange : dateRange;

    if (newSearch.trim()) sp.set("search", newSearch.trim());
    else sp.delete("search");

    if (newStatus && newStatus !== "all") sp.set("status", newStatus);
    else sp.delete("status");

    if (newProvider && newProvider !== "all") sp.set("provider", newProvider);
    else sp.delete("provider");

    if (newSort && newSort !== "newest") sp.set("sort", newSort);
    else sp.delete("sort");

    if (newDateRange && newDateRange !== "all") sp.set("dateRange", newDateRange);
    else sp.delete("dateRange");

    startTransition(() => {
      router.push(`/admin/payments?${sp.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ search });
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setProvider("all");
    setSort("newest");
    setDateRange("all");

    const sp = new URLSearchParams();
    const pageSize = searchParams.get("pageSize");
    if (pageSize) sp.set("pageSize", pageSize);

    startTransition(() => {
      router.push(`/admin/payments?${sp.toString()}`);
    });
  };

  const exportToCSV = () => {
    if (!exportData.length) {
      alert("No payment transactions matching your current filters to export.");
      return;
    }

    const headers = [
      "Order Number",
      "Customer Email",
      "Payment Reference",
      "Provider",
      "Status",
      "Amount",
      "Currency",
      "Date (UTC)",
    ];

    const rows = exportData.map((p) => [
      `"${p.orderNumber}"`,
      `"${p.customerEmail}"`,
      `"${p.reference}"`,
      `"${p.provider}"`,
      `"${p.status}"`,
      (p.amountMinor / 100).toFixed(2),
      `"${p.currency}"`,
      `"${new Date(p.createdAt).toISOString()}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `solure_scents_payments_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters =
    Boolean(currentSearch) ||
    currentStatus !== "all" ||
    currentProvider !== "all" ||
    currentSort !== "newest" ||
    currentDateRange !== "all";

  return (
    <div className="space-y-3 rounded border border-charcoal/15 bg-white p-4 shadow-soft">
      {/* Top row: Search and Export */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            placeholder="Search reference, order #, customer email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-charcoal/20 bg-ivory/30 py-2 pl-9 pr-20 text-xs text-charcoal focus:border-gold focus:bg-white focus:outline-hidden"
          />
          <button
            type="submit"
            className="absolute right-1 top-1 bottom-1 bg-charcoal px-3 text-[11px] font-semibold uppercase tracking-wider text-pearl hover:bg-gold hover:text-charcoal transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex min-h-9 items-center gap-1.5 border border-charcoal/20 px-3 text-xs font-semibold uppercase tracking-wider text-muted hover:border-gold hover:text-charcoal transition"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={exportToCSV}
            className="inline-flex min-h-9 items-center gap-1.5 border border-charcoal/20 bg-ivory/50 px-3 text-xs font-semibold uppercase tracking-wider text-charcoal hover:border-gold hover:text-gold transition"
            title="Download CSV export of currently filtered payment transactions"
          >
            <Download size={13} className="text-gold" />
            <span>Export CSV ({exportData.length})</span>
          </button>
        </div>
      </div>

      {/* Filter and Sort controls */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs pt-1 border-t border-charcoal/10">
        {/* Status Filter */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              applyFilters({ status: e.target.value });
            }}
            className="w-full border border-charcoal/20 bg-white p-1.5 text-xs text-charcoal focus:border-gold focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="captured">Captured (Settled)</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed / Cancelled</option>
            <option value="partially_refunded">Partially Refunded</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        {/* Provider Filter */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
            Provider
          </label>
          <select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              applyFilters({ provider: e.target.value });
            }}
            className="w-full border border-charcoal/20 bg-white p-1.5 text-xs text-charcoal focus:border-gold focus:outline-hidden"
          >
            <option value="all">All Providers</option>
            <option value="paystack">Paystack (Test)</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash_on_delivery">Cash on Delivery</option>
            <option value="manual_invoice">Manual Invoice</option>
          </select>
        </div>

        {/* Date Filter */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
            Date Window
          </label>
          <select
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value);
              applyFilters({ dateRange: e.target.value });
            }}
            className="w-full border border-charcoal/20 bg-white p-1.5 text-xs text-charcoal focus:border-gold focus:outline-hidden"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="this_month">This Month</option>
          </select>
        </div>

        {/* Sort Filter */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
            Sort Order
          </label>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              applyFilters({ sort: e.target.value });
            }}
            className="w-full border border-charcoal/20 bg-white p-1.5 text-xs text-charcoal focus:border-gold focus:outline-hidden"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
          </select>
        </div>
      </div>
    </div>
  );
}
