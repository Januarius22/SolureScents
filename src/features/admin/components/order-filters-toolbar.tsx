"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, RotateCcw } from "lucide-react";

interface OrderFiltersToolbarProps {
  currentSearch?: string;
  currentStatus?: string;
  currentPaymentStatus?: string;
  currentDeliveryStatus?: string;
  currentSort?: string;
  currentDateRange?: string;
}

export function OrderFiltersToolbar({
  currentSearch = "",
  currentStatus = "all",
  currentPaymentStatus = "all",
  currentDeliveryStatus = "all",
  currentSort = "newest",
  currentDateRange = "all",
}: OrderFiltersToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(currentSearch);
  const [status, setStatus] = useState(currentStatus);
  const [paymentStatus, setPaymentStatus] = useState(currentPaymentStatus);
  const [deliveryStatus, setDeliveryStatus] = useState(currentDeliveryStatus);
  const [sort, setSort] = useState(currentSort);
  const [dateRange, setDateRange] = useState(currentDateRange);

  const applyFilters = (updates: {
    search?: string;
    status?: string;
    paymentStatus?: string;
    deliveryStatus?: string;
    sort?: string;
    dateRange?: string;
  }) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("page"); // Reset page when filters change

    const newSearch = updates.search !== undefined ? updates.search : search;
    const newStatus = updates.status !== undefined ? updates.status : status;
    const newPaymentStatus =
      updates.paymentStatus !== undefined ? updates.paymentStatus : paymentStatus;
    const newDeliveryStatus =
      updates.deliveryStatus !== undefined ? updates.deliveryStatus : deliveryStatus;
    const newSort = updates.sort !== undefined ? updates.sort : sort;
    const newDateRange = updates.dateRange !== undefined ? updates.dateRange : dateRange;

    if (newSearch.trim()) sp.set("search", newSearch.trim());
    else sp.delete("search");

    if (newStatus && newStatus !== "all") sp.set("status", newStatus);
    else sp.delete("status");

    if (newPaymentStatus && newPaymentStatus !== "all") sp.set("paymentStatus", newPaymentStatus);
    else sp.delete("paymentStatus");

    if (newDeliveryStatus && newDeliveryStatus !== "all") sp.set("deliveryStatus", newDeliveryStatus);
    else sp.delete("deliveryStatus");

    if (newSort && newSort !== "newest") sp.set("sort", newSort);
    else sp.delete("sort");

    if (newDateRange && newDateRange !== "all") sp.set("dateRange", newDateRange);
    else sp.delete("dateRange");

    startTransition(() => {
      router.push(`/admin/orders?${sp.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ search });
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setPaymentStatus("all");
    setDeliveryStatus("all");
    setSort("newest");
    setDateRange("all");

    const sp = new URLSearchParams();
    const pageSize = searchParams.get("pageSize");
    if (pageSize) sp.set("pageSize", pageSize);

    startTransition(() => {
      router.push(`/admin/orders?${sp.toString()}`);
    });
  };

  const hasActiveFilters =
    Boolean(currentSearch) ||
    currentStatus !== "all" ||
    currentPaymentStatus !== "all" ||
    currentDeliveryStatus !== "all" ||
    currentSort !== "newest" ||
    currentDateRange !== "all";

  return (
    <div className="space-y-3 rounded border border-charcoal/15 bg-white p-4 shadow-soft">
      {/* Search Input Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            placeholder="Search order number, customer name, email or phone..."
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

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex min-h-9 items-center gap-1.5 border border-charcoal/20 px-3 text-xs font-semibold uppercase tracking-wider text-muted hover:border-gold hover:text-charcoal transition shrink-0"
          >
            <RotateCcw size={13} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Filter and Sort Row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 text-xs pt-2 border-t border-charcoal/10">
        {/* Order Status */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
            Order Status
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              applyFilters({ status: e.target.value });
            }}
            className="w-full border border-charcoal/20 bg-white p-1.5 text-xs text-charcoal focus:border-gold focus:outline-hidden"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        {/* Payment Status */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
            Payment Status
          </label>
          <select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              applyFilters({ paymentStatus: e.target.value });
            }}
            className="w-full border border-charcoal/20 bg-white p-1.5 text-xs text-charcoal focus:border-gold focus:outline-hidden"
          >
            <option value="all">All Payments</option>
            <option value="captured">Captured (Paid)</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Delivery Arrangement Status */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
            Delivery State
          </label>
          <select
            value={deliveryStatus}
            onChange={(e) => {
              setDeliveryStatus(e.target.value);
              applyFilters({ deliveryStatus: e.target.value });
            }}
            className="w-full border border-charcoal/20 bg-white p-1.5 text-xs text-charcoal focus:border-gold focus:outline-hidden"
          >
            <option value="all">All Deliveries</option>
            <option value="arranged_separately">Arrangement Pending</option>
            <option value="configured">Configured Courier</option>
            <option value="pending">Pending</option>
            <option value="free">Complimentary</option>
          </select>
        </div>

        {/* Date Window */}
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
          </select>
        </div>

        {/* Sort */}
        <div className="col-span-2 sm:col-span-1">
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
            <option value="highest">Highest Value</option>
            <option value="lowest">Lowest Value</option>
          </select>
        </div>
      </div>
    </div>
  );
}
