import type { Metadata } from "next";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CreditCard,
  RotateCcw,
  ShoppingBag,
  AlertTriangle,
  ShieldCheck,
  Package,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  Sparkles,
} from "lucide-react";

import { AccountHeader, Money, Panel } from "@/components/account/account-ui";
import {
  getAnalyticsSnapshot,
  type MetricComparison,
} from "@/features/admin/services/analytics";
import { AnalyticsDateFilter } from "@/features/admin/components/analytics-date-filter";

export const metadata: Metadata = {
  title: "Commerce & Revenue Intelligence | Solure Scents Admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
  }>;
}

function ComparisonBadge({
  comparison,
  invertSentiment = false,
}: {
  comparison: MetricComparison;
  invertSentiment?: boolean;
}) {
  if (comparison.isNeutral) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-charcoal/5 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
        <Minus size={10} />
        <span>No prior baseline</span>
      </span>
    );
  }

  const isGood = invertSentiment ? !comparison.isPositive : comparison.isPositive;
  const formattedPercent = `${comparison.percentChange > 0 ? "+" : ""}${comparison.percentChange.toFixed(1)}%`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
        isGood
          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
          : "bg-rose-50 text-rose-800 border border-rose-200"
      }`}
    >
      {comparison.isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      <span>{formattedPercent}</span>
      <span className="font-normal opacity-75">vs prev period</span>
    </span>
  );
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const d = await getAnalyticsSnapshot({
    range: params.range,
    from: params.from,
    to: params.to,
  });

  const maxTimeSeriesRevenue = Math.max(...d.timeSeries.map((x) => x.revenueMinor), 1);

  return (
    <div className="space-y-8">
      {/* Top Header with Date Range Filter */}
      <div className="flex flex-col justify-between gap-4 border-b border-charcoal/10 pb-6 lg:flex-row lg:items-end">
        <div>
          <AccountHeader
            eyebrow="Commercial Intelligence & Audit"
            title="Revenue & Performance Analytics"
            copy="Authoritative financial health metrics calculated strictly from verified Paystack and ledger transactions."
          />
        </div>

        <div className="shrink-0">
          <AnalyticsDateFilter
            currentRange={params.range || "30d"}
            currentFrom={params.from || ""}
            currentTo={params.to || ""}
            activeLabel={d.range.label}
          />
        </div>
      </div>

      {/* Date Range Active Indicator Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-charcoal/15 bg-white px-4 py-2.5 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-gold" />
          <span className="text-muted">Active Reporting Horizon:</span>
          <span className="font-bold text-charcoal">{d.range.label}</span>
          <span className="text-muted text-[11px]">
            ({d.range.startDate.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })} –{" "}
            {d.range.endDate.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })})
          </span>
        </div>
        <div className="text-[11px] text-muted">
          Comparing against previous equivalent window (
          {d.range.previousStartDate.toLocaleDateString("en-NG", { month: "short", day: "numeric" })} –{" "}
          {d.range.previousEndDate.toLocaleDateString("en-NG", { month: "short", day: "numeric" })})
        </div>
      </div>

      {/* Primary 8 Business KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Gross Captured Revenue */}
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-wider uppercase">
              1. Gross Captured
            </span>
            <CreditCard size={16} className="text-emerald-700" />
          </div>
          <p className="mt-2 font-display text-2xl text-charcoal sm:text-3xl">
            <Money amount={d.grossCaptured.value} currency={d.currency} />
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-muted">Total settled funds</p>
            <ComparisonBadge comparison={d.grossCaptured} />
          </div>
        </div>

        {/* 2. Total Refunds */}
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-wider uppercase">
              2. Total Refunds
            </span>
            <RotateCcw size={16} className="text-rose-700" />
          </div>
          <p className="mt-2 font-display text-2xl text-rose-800 sm:text-3xl">
            <Money amount={d.refunds.value} currency={d.currency} />
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-muted">Full & partial adjustments</p>
            <ComparisonBadge comparison={d.refunds} invertSentiment={true} />
          </div>
        </div>

        {/* 3. Net Collected Sales */}
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-wider uppercase">
              3. Net Collected
            </span>
            <TrendingUp size={16} className="text-gold" />
          </div>
          <p className="mt-2 font-display text-2xl text-charcoal sm:text-3xl">
            <Money amount={d.netRevenue.value} currency={d.currency} />
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-muted">Sales post-refunds</p>
            <ComparisonBadge comparison={d.netRevenue} />
          </div>
        </div>

        {/* 4. Paid Orders */}
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-wider uppercase">
              4. Paid Orders
            </span>
            <ShoppingBag size={16} className="text-blue-700" />
          </div>
          <p className="mt-2 font-display text-2xl text-charcoal sm:text-3xl">
            {d.paidOrders.value}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-muted">{d.pendingOrdersCount} awaiting capture</p>
            <ComparisonBadge comparison={d.paidOrders} />
          </div>
        </div>

        {/* 5. Average Order Value */}
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-wider uppercase">
              5. Avg Order Value
            </span>
            <Sparkles size={16} className="text-gold" />
          </div>
          <p className="mt-2 font-display text-2xl text-charcoal sm:text-3xl">
            <Money amount={d.averageOrderValue.value} currency={d.currency} />
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-muted">Per paid checkout</p>
            <ComparisonBadge comparison={d.averageOrderValue} />
          </div>
        </div>

        {/* 6. Total Units Sold */}
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-wider uppercase">
              6. Units Sold
            </span>
            <Package size={16} className="text-purple-700" />
          </div>
          <p className="mt-2 font-display text-2xl text-charcoal sm:text-3xl">
            {d.totalUnitsSold.value} <span className="text-sm font-normal text-muted">flacons</span>
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-muted">Perfume bottles dispatched</p>
            <ComparisonBadge comparison={d.totalUnitsSold} />
          </div>
        </div>

        {/* 7. New Customers */}
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-wider uppercase">
              7. New Customers
            </span>
            <Users size={16} className="text-teal-700" />
          </div>
          <p className="mt-2 font-display text-2xl text-charcoal sm:text-3xl">
            {d.newCustomers.value}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-muted">First-time purchasers</p>
            <ComparisonBadge comparison={d.newCustomers} />
          </div>
        </div>

        {/* 8. Low-Stock Products */}
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-wider uppercase">
              8. Low-Stock Variants
            </span>
            <AlertTriangle
              size={16}
              className={d.lowStockAlertsCount > 0 ? "text-amber-600" : "text-emerald-600"}
            />
          </div>
          <p
            className={`mt-2 font-display text-2xl sm:text-3xl ${
              d.lowStockAlertsCount > 0 ? "text-amber-700 font-bold" : "text-charcoal"
            }`}
          >
            {d.lowStockAlertsCount}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-muted">
              {d.inventoryHealth.outOfStockCount > 0
                ? `${d.inventoryHealth.outOfStockCount} out of stock`
                : "Real-time stock state"}
            </p>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                d.lowStockAlertsCount > 0
                  ? "bg-amber-50 text-amber-900 border border-amber-200"
                  : "bg-emerald-50 text-emerald-900"
              }`}
            >
              Current State
            </span>
          </div>
        </div>
      </div>

      {/* Task 3A: Adaptive Revenue Over Time Visualization */}
      <Panel
        title={`Revenue Over Time (${d.range.label} · ${
          d.range.granularity === "daily"
            ? "Daily Granularity"
            : d.range.granularity === "weekly"
            ? "Weekly Aggregation"
            : "Monthly Aggregation"
        })`}
      >
        <div
          className="flex h-64 items-end gap-1.5 pt-6"
          role="img"
          aria-label={`Revenue over time for ${d.range.label}`}
        >
          {d.timeSeries.map((x) => {
            const heightPercent = Math.max((x.revenueMinor / maxTimeSeriesRevenue) * 100, 3);
            const hasSales = x.revenueMinor > 0;
            return (
              <div
                className={`group relative flex-1 transition-all rounded-t-sm ${
                  hasSales ? "bg-gold hover:bg-charcoal" : "bg-champagne/40 hover:bg-champagne"
                }`}
                key={x.key}
                style={{ height: `${heightPercent}%` }}
              >
                <span className="sr-only">
                  {x.label}: {x.orders} orders
                </span>
                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap border border-charcoal/15 bg-charcoal px-2.5 py-1.5 text-[11px] text-pearl shadow-lg group-hover:block">
                  <span className="font-semibold block">{x.label}</span>
                  <span>
                    ₦{(x.revenueMinor / 100).toLocaleString()} ({x.orders} paid orders)
                  </span>
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-between border-t border-charcoal/10 pt-3 text-xs text-muted">
          <span>{d.timeSeries[0]?.label}</span>
          <span className="text-[11px] tracking-wider uppercase">
            {d.range.granularity} Revenue Trend · Africa/Lagos
          </span>
          <span>{d.timeSeries.at(-1)?.label}</span>
        </div>
      </Panel>

      {/* Grid: Best-Selling Perfumes & Order Status Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Task 3B: Best-Selling Perfumes */}
        <Panel title={`Best-Selling Perfumes (${d.range.label})`}>
          {d.bestSellingPerfumes.length > 0 ? (
            <div className="divide-y divide-charcoal/10">
              {d.bestSellingPerfumes.map((p, idx) => (
                <div key={p.name} className="py-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex size-6 items-center justify-center rounded-full bg-champagne font-mono text-[11px] font-bold text-charcoal">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-charcoal text-sm">{p.name}</p>
                        <p className="text-muted">
                          {p.unitsSold} flacons sold ·{" "}
                          <span className="font-medium text-gold">
                            {p.percentageOfTotal.toFixed(1)}% of volume
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-charcoal text-sm">
                        <Money amount={p.revenueMinor} currency={d.currency} />
                      </span>
                    </div>
                  </div>
                  {/* Visual volume percentage progress bar */}
                  <div className="mt-2 h-1.5 w-full rounded-full bg-charcoal/5">
                    <div
                      className="h-1.5 rounded-full bg-gold transition-all"
                      style={{ width: `${Math.min(100, p.percentageOfTotal)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-muted">
              No product sales recorded in the selected period ({d.range.label}). Completed orders
              will rank here automatically.
            </p>
          )}
        </Panel>

        {/* Task 3C: Order Status Overview */}
        <Panel title={`Order Status Overview (${d.range.label})`}>
          <div className="space-y-3">
            <p className="text-[11px] text-muted">
              * Order fulfillment status is monitored separately from verified collected revenue.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="border border-charcoal/10 bg-ivory/40 p-3 rounded">
                <div className="flex items-center justify-between text-muted text-xs">
                  <span>Pending</span>
                  <Clock size={14} className="text-amber-600" />
                </div>
                <p className="mt-1 font-display text-2xl text-amber-800">
                  {d.orderStatusOverview.pending}
                </p>
                <span className="text-[10px] text-muted">Awaiting confirmation</span>
              </div>

              <div className="border border-charcoal/10 bg-ivory/40 p-3 rounded">
                <div className="flex items-center justify-between text-muted text-xs">
                  <span>Confirmed</span>
                  <CheckCircle2 size={14} className="text-blue-600" />
                </div>
                <p className="mt-1 font-display text-2xl text-blue-800">
                  {d.orderStatusOverview.confirmed}
                </p>
                <span className="text-[10px] text-muted">Payment verified</span>
              </div>

              <div className="border border-charcoal/10 bg-ivory/40 p-3 rounded">
                <div className="flex items-center justify-between text-muted text-xs">
                  <span>Processing</span>
                  <Package size={14} className="text-purple-600" />
                </div>
                <p className="mt-1 font-display text-2xl text-purple-800">
                  {d.orderStatusOverview.processing}
                </p>
                <span className="text-[10px] text-muted">Atelier packing</span>
              </div>

              <div className="border border-charcoal/10 bg-ivory/40 p-3 rounded">
                <div className="flex items-center justify-between text-muted text-xs">
                  <span>Shipped</span>
                  <Truck size={14} className="text-indigo-600" />
                </div>
                <p className="mt-1 font-display text-2xl text-indigo-800">
                  {d.orderStatusOverview.shipped}
                </p>
                <span className="text-[10px] text-muted">In courier transit</span>
              </div>

              <div className="border border-charcoal/10 bg-ivory/40 p-3 rounded">
                <div className="flex items-center justify-between text-muted text-xs">
                  <span>Delivered</span>
                  <CheckCircle2 size={14} className="text-emerald-600" />
                </div>
                <p className="mt-1 font-display text-2xl text-emerald-800">
                  {d.orderStatusOverview.delivered}
                </p>
                <span className="text-[10px] text-muted">Safely received</span>
              </div>

              <div className="border border-charcoal/10 bg-ivory/40 p-3 rounded">
                <div className="flex items-center justify-between text-muted text-xs">
                  <span>Cancelled</span>
                  <XCircle size={14} className="text-zinc-600" />
                </div>
                <p className="mt-1 font-display text-2xl text-zinc-700">
                  {d.orderStatusOverview.cancelled}
                </p>
                <span className="text-[10px] text-muted">Voided orders</span>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Grid: Task 3D Inventory Health & Task 3E Payment Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Task 3D: Inventory Health (Current-State Metric) */}
        <Panel title="Inventory Health (Current Warehouse State)">
          <div className="space-y-4 text-xs">
            <div className="rounded border border-charcoal/10 bg-ivory/40 p-3">
              <p className="font-semibold text-charcoal">Real-Time Stock Allocations</p>
              <p className="text-[11px] text-muted mt-0.5">
                Current warehouse metrics reflect live on-hand physical stock, distinct from selected
                reporting periods.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="border border-charcoal/10 bg-white p-2 rounded">
                  <span className="block text-[10px] text-muted uppercase">Total Units</span>
                  <span className="font-mono text-base font-bold text-charcoal">
                    {d.inventoryHealth.totalAvailableUnits}
                  </span>
                </div>
                <div className="border border-amber-200 bg-amber-50/50 p-2 rounded">
                  <span className="block text-[10px] text-amber-800 uppercase">Low Stock</span>
                  <span className="font-mono text-base font-bold text-amber-900">
                    {d.inventoryHealth.lowStockCount}
                  </span>
                </div>
                <div className="border border-rose-200 bg-rose-50/50 p-2 rounded">
                  <span className="block text-[10px] text-rose-800 uppercase">Out of Stock</span>
                  <span className="font-mono text-base font-bold text-rose-900">
                    {d.inventoryHealth.outOfStockCount}
                  </span>
                </div>
              </div>
            </div>

            {/* List of Low Stock Products */}
            {d.lowStockProducts.length > 0 ? (
              <div className="divide-y divide-charcoal/10 border-t border-charcoal/10 pt-2">
                <p className="text-[11px] font-semibold tracking-wider text-muted uppercase mb-2">
                  Action Required: Restock Needed
                </p>
                {d.lowStockProducts.map((item) => (
                  <div key={item.sku} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle size={13} className="text-amber-600" />
                        <p className="font-semibold text-charcoal">{item.productName}</p>
                      </div>
                      <p className="text-[11px] text-muted">
                        {item.variantLabel} · SKU: <span className="font-mono">{item.sku}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block border border-amber-300 bg-amber-50 px-2 py-0.5 rounded font-mono text-xs font-bold text-amber-900">
                        {item.available} Available
                      </span>
                      <small className="block text-[10px] text-muted mt-0.5">
                        Threshold: {item.limit}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 py-3 text-center justify-center text-xs text-emerald-800">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>All catalog flacons are stocked above safety thresholds.</span>
              </div>
            )}
          </div>
        </Panel>

        {/* Task 3E: Payment Performance */}
        <Panel title={`Payment Performance (${d.range.label})`}>
          <div className="space-y-4 text-xs">
            <p className="text-[11px] text-muted">
              Authoritative ledger breakdown comparing successfully captured collections against
              pending attempts, failures, and refunds.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Captured */}
              <div className="border border-emerald-300 bg-emerald-50/60 p-3 rounded">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-950 uppercase tracking-wider text-[11px]">
                    Captured (Settled)
                  </span>
                  <CheckCircle2 size={14} className="text-emerald-700" />
                </div>
                <p className="mt-2 font-display text-xl text-emerald-900">
                  <Money amount={d.paymentPerformance.capturedMinor} currency={d.currency} />
                </p>
                <p className="text-[10px] text-emerald-800 mt-0.5">
                  {d.paymentPerformance.capturedCount} successful payments
                </p>
              </div>

              {/* Pending */}
              <div className="border border-amber-300 bg-amber-50/60 p-3 rounded">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-950 uppercase tracking-wider text-[11px]">
                    Pending Verification
                  </span>
                  <Clock size={14} className="text-amber-700" />
                </div>
                <p className="mt-2 font-display text-xl text-amber-900">
                  <Money amount={d.paymentPerformance.pendingMinor} currency={d.currency} />
                </p>
                <p className="text-[10px] text-amber-800 mt-0.5">
                  {d.paymentPerformance.pendingCount} open checkouts
                </p>
              </div>

              {/* Failed */}
              <div className="border border-zinc-300 bg-zinc-50 p-3 rounded">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 uppercase tracking-wider text-[11px]">
                    Failed / Aborted
                  </span>
                  <XCircle size={14} className="text-zinc-600" />
                </div>
                <p className="mt-2 font-display text-xl text-zinc-800">
                  <Money amount={d.paymentPerformance.failedMinor} currency={d.currency} />
                </p>
                <p className="text-[10px] text-muted mt-0.5">
                  {d.paymentPerformance.failedCount} declined attempts
                </p>
              </div>

              {/* Refunded */}
              <div className="border border-rose-300 bg-rose-50/60 p-3 rounded">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-rose-950 uppercase tracking-wider text-[11px]">
                    Refunded Adjustments
                  </span>
                  <RotateCcw size={14} className="text-rose-700" />
                </div>
                <p className="mt-2 font-display text-xl text-rose-900">
                  <Money amount={d.paymentPerformance.refundedMinor} currency={d.currency} />
                </p>
                <p className="text-[10px] text-rose-800 mt-0.5">
                  {d.paymentPerformance.refundedCount} transactions adjusted
                </p>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Recent Ledger Transactions */}
      <Panel title={`Recent Verified Transactions (${d.range.label})`}>
        {d.recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-charcoal/10 text-muted uppercase tracking-wider text-[11px]">
                  <th className="pb-3 font-semibold">Order</th>
                  <th className="pb-3 font-semibold">Reference</th>
                  <th className="pb-3 font-semibold">Gateway</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Amount</th>
                  <th className="pb-3 font-semibold text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/10">
                {d.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-cream/40">
                    <td className="py-3 font-mono font-semibold text-charcoal">
                      {tx.orderNumber ?? "Direct"}
                    </td>
                    <td className="py-3 font-mono text-muted text-[11px] truncate max-w-[160px]">
                      {tx.reference ?? "None"}
                    </td>
                    <td className="py-3 uppercase text-[11px] font-medium text-charcoal">
                      {tx.provider === "paystack" ? "Paystack Test" : tx.provider}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-block border px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          tx.status === "captured"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                            : tx.status === "pending"
                            ? "border-amber-300 bg-amber-50 text-amber-900"
                            : "border-rose-300 bg-rose-50 text-rose-900"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 font-mono font-semibold text-right text-charcoal">
                      <Money amount={tx.amountMinor} currency={tx.currency} />
                    </td>
                    <td className="py-3 text-right text-muted text-[11px]">
                      {new Date(tx.createdAt).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-xs text-muted">
            No transactions registered in this period. Completed customer checkouts will appear here.
          </p>
        )}
      </Panel>
    </div>
  );
}
