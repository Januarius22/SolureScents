import type { Metadata } from "next";
import {
  TrendingUp,
  CreditCard,
  RotateCcw,
  ShoppingBag,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

import { AccountHeader, Money, Panel } from "@/components/account/account-ui";
import { getAnalyticsSnapshot } from "@/features/admin/services/analytics";

export const metadata: Metadata = {
  title: "Commerce & Revenue Intelligence | Solure Scents Admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminAnalyticsPage() {
  const d = await getAnalyticsSnapshot();
  const maxDailyRevenue = Math.max(...d.daily.map((x) => x.revenueMinor), 1);

  return (
    <div className="space-y-8">
      <AccountHeader
        eyebrow="Commercial Intelligence & Audit"
        title="Revenue & Performance Analytics"
        copy="Authoritative financial health metrics calculated strictly from verified Paystack and ledger transactions."
      />

      {/* Primary Financial KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gross Captured Revenue */}
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-wider text-muted uppercase">
              Gross Captured
            </span>
            <CreditCard size={16} className="text-emerald-700" />
          </div>
          <p className="mt-2 font-display text-3xl text-charcoal sm:text-4xl">
            <Money amount={d.grossCapturedMinor} currency={d.currency} />
          </p>
          <p className="mt-1 text-xs text-muted">Total settled funds received</p>
        </div>

        {/* Refund Totals */}
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-wider text-muted uppercase">
              Refunds Issued
            </span>
            <RotateCcw size={16} className="text-rose-700" />
          </div>
          <p className="mt-2 font-display text-3xl text-rose-800 sm:text-4xl">
            <Money amount={d.refundsMinor} currency={d.currency} />
          </p>
          <p className="mt-1 text-xs text-muted">Full & partial return adjustments</p>
        </div>

        {/* Net Collected Sales */}
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-wider text-muted uppercase">
              Net Collected
            </span>
            <TrendingUp size={16} className="text-gold" />
          </div>
          <p className="mt-2 font-display text-3xl text-charcoal sm:text-4xl">
            <Money amount={d.netRevenueMinor} currency={d.currency} />
          </p>
          <p className="mt-1 text-xs text-muted">Net sales retained post-refunds</p>
        </div>

        {/* Paid Order Count & Average Order */}
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-wider text-muted uppercase">
              Paid Orders
            </span>
            <ShoppingBag size={16} className="text-blue-700" />
          </div>
          <p className="mt-2 font-display text-3xl text-charcoal sm:text-4xl">{d.orders}</p>
          <p className="mt-1 text-xs text-muted">
            Avg: <Money amount={d.averageOrderMinor} currency={d.currency} /> · {d.pendingOrdersCount} awaiting payment
          </p>
        </div>
      </div>

      {/* 30-Day Daily Revenue Visualization */}
      <Panel title="Sales Volume Over Time (Past 30 Days)">
        <div className="flex h-64 items-end gap-1 pt-6" role="img" aria-label="Daily revenue for the last 30 days">
          {d.daily.map((x) => {
            const heightPercent = Math.max((x.revenueMinor / maxDailyRevenue) * 100, 3);
            const hasSales = x.revenueMinor > 0;
            return (
              <div
                className={`group relative flex-1 transition-all rounded-t-sm ${
                  hasSales ? "bg-gold hover:bg-charcoal" : "bg-champagne/40 hover:bg-champagne"
                }`}
                key={x.date}
                style={{ height: `${heightPercent}%` }}
              >
                <span className="sr-only">
                  {x.date}: {x.orders} orders
                </span>
                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap border border-charcoal/15 bg-charcoal px-2.5 py-1.5 text-[11px] text-pearl shadow-lg group-hover:block">
                  <span className="font-semibold block">{x.date}</span>
                  <span>
                    ₦{(x.revenueMinor / 100).toLocaleString()} ({x.orders} orders)
                  </span>
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-between border-t border-charcoal/10 pt-3 text-xs text-muted">
          <span>{d.daily[0]?.date}</span>
          <span className="text-[11px] tracking-wider uppercase">30-Day Revenue Horizon</span>
          <span>{d.daily.at(-1)?.date}</span>
        </div>
      </Panel>

      {/* Best-Selling Perfumes & Low-Stock Alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Best Selling Perfumes */}
        <Panel title="Best-Selling Perfumes">
          {d.bestSellingPerfumes.length > 0 ? (
            <div className="divide-y divide-charcoal/10">
              {d.bestSellingPerfumes.map((p, idx) => (
                <div key={p.name} className="flex items-center justify-between py-3.5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-champagne font-mono text-[11px] font-bold text-charcoal">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-charcoal text-sm">{p.name}</p>
                      <p className="text-muted">{p.unitsSold} flacons sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-semibold text-charcoal">
                      <Money amount={p.revenueMinor} currency={d.currency} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-muted">
              No sales recorded in the current period. Completed orders will rank here automatically.
            </p>
          )}
        </Panel>

        {/* Low-Stock Fragrance Variants */}
        <Panel title="Low-Stock Inventory Alerts">
          {d.lowStockProducts.length > 0 ? (
            <div className="divide-y divide-charcoal/10">
              {d.lowStockProducts.map((item) => (
                <div key={item.sku} className="flex items-center justify-between py-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-amber-600" />
                      <p className="font-semibold text-charcoal">{item.productName}</p>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {item.variantLabel} · SKU: <span className="font-mono">{item.sku}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block border border-amber-300 bg-amber-50 px-2 py-0.5 rounded font-mono text-xs font-bold text-amber-900">
                      {item.available} Left
                    </span>
                    <small className="block text-[10px] text-muted mt-0.5">Limit: {item.limit}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-6 text-center justify-center text-xs text-emerald-800">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>All catalog variants are currently safely stocked above minimum limits.</span>
            </div>
          )}
        </Panel>
      </div>

      {/* Recent Ledger Transactions */}
      <Panel title="Recent Payment Transactions">
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
            No transactions registered yet. Customer checkouts and gateway captures will be listed here.
          </p>
        )}
      </Panel>
    </div>
  );
}
