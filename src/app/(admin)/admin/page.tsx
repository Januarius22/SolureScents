import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Clock,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Money } from "@/components/account/account-ui";
import { getCommerceOperations } from "@/features/admin/services/commerce-operations";

export const metadata: Metadata = {
  title: "Admin Command Centre | Solure Scents",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-300",
  confirmed: "bg-blue-100 text-blue-900 border-blue-300",
  processing: "bg-purple-100 text-purple-900 border-purple-300",
  shipped: "bg-indigo-100 text-indigo-900 border-indigo-300",
  delivered: "bg-emerald-100 text-emerald-900 border-emerald-300",
  cancelled: "bg-zinc-100 text-zinc-700 border-zinc-300",
  refunded: "bg-rose-100 text-rose-900 border-rose-300",
};

export default async function AdminDashboardPage() {
  const operations = await getCommerceOperations();

  // Authoritative payment categorization: only captured payments contribute to gross collected revenue
  const capturedPayments = operations.payments.filter((p) =>
    ["captured", "partially_refunded"].includes(p.status),
  );
  const paidOrderIds = new Set(
    capturedPayments.map((p) => p.order_id).filter(Boolean) as string[],
  );
  const paidOrders = operations.orders.filter((o) => paidOrderIds.has(o.id));

  const grossRevenue = capturedPayments.reduce(
    (sum, p) => sum + (p.amount_minor || 0) - (p.refunded_minor || 0),
    0,
  );
  const primaryCurrency = operations.orders[0]?.currency ?? operations.payments[0]?.currency ?? "NGN";

  const pendingFulfillment = operations.orders.filter(
    (o) => o.status === "confirmed" || o.status === "processing",
  ).length;

  const deliveredCount = operations.orders.filter((o) => o.status === "delivered").length;

  // Calculate low-stock variants
  const lowStockRecords = operations.levels
    .map((level) => {
      const variant = operations.variants.find((v) => v.id === level.variant_id);
      const product = variant
        ? operations.products.find((p) => p.id === variant.product_id)
        : undefined;
      const available = level.on_hand - level.reserved;
      const threshold = variant?.low_stock_limit ?? 5;

      return {
        id: level.id,
        productName: product?.name ?? "Fragrance",
        variantLabel: variant?.label ?? "Variant",
        sku: variant?.sku ?? "SKU",
        onHand: level.on_hand,
        reserved: level.reserved,
        available,
        threshold,
        isLow: available <= threshold,
      };
    })
    .filter((item) => item.isLow);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-charcoal/10 pb-6 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-gold uppercase">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            Live Commerce Operations
          </div>
          <h1 className="mt-2 font-display text-4xl text-charcoal sm:text-5xl">
            Command Centre
          </h1>
          <p className="mt-2 text-sm text-muted">
            Overview of store orders, stock movements, and revenue metrics.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/admin/orders"
            className="inline-flex min-h-10 items-center gap-2 bg-charcoal px-4 text-xs font-semibold tracking-wider text-pearl uppercase transition-colors hover:bg-gold hover:text-charcoal"
          >
            <Truck size={14} />
            <span>Fulfillment Desk</span>
          </Link>
          <Link
            href="/admin/inventory"
            className="inline-flex min-h-10 items-center gap-2 border border-charcoal/20 bg-white px-4 text-xs font-semibold tracking-wider text-charcoal uppercase transition-colors hover:border-gold hover:text-gold"
          >
            <Boxes size={14} />
            <span>Adjust Stock</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gross Revenue */}
        <div className="border border-charcoal/10 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-[0.16em] uppercase">Gross Revenue</span>
            <span className="flex size-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <TrendingUp size={17} />
            </span>
          </div>
          <p className="mt-4 font-display text-3xl text-charcoal sm:text-4xl">
            <Money amount={grossRevenue} currency={primaryCurrency} />
          </p>
          <p className="mt-2 text-xs text-muted">
            {paidOrders.length} paid customer orders
          </p>
        </div>

        {/* Total Orders */}
        <div className="border border-charcoal/10 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-[0.16em] uppercase">All Orders</span>
            <span className="flex size-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <ShoppingCart size={17} />
            </span>
          </div>
          <p className="mt-4 font-display text-3xl text-charcoal sm:text-4xl">
            {operations.orders.length}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted">
            <span className="text-amber-700 font-medium">{pendingFulfillment} pending</span>
            <span>·</span>
            <span className="text-emerald-700 font-medium">{deliveredCount} delivered</span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className={`border p-6 shadow-soft bg-white ${lowStockRecords.length > 0 ? "border-amber-300" : "border-charcoal/10"}`}>
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-[0.16em] uppercase">Stock Alerts</span>
            <span className={`flex size-9 items-center justify-center rounded-full ${lowStockRecords.length > 0 ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-600"}`}>
              <AlertTriangle size={17} />
            </span>
          </div>
          <p className={`mt-4 font-display text-3xl sm:text-4xl ${lowStockRecords.length > 0 ? "text-amber-700" : "text-charcoal"}`}>
            {lowStockRecords.length}
          </p>
          <p className="mt-2 text-xs text-muted">
            {lowStockRecords.length > 0 ? "SKUs below minimum limit" : "All SKUs safely stocked"}
          </p>
        </div>

        {/* Active SKUs */}
        <div className="border border-charcoal/10 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-[0.16em] uppercase">Catalogue SKUs</span>
            <span className="flex size-9 items-center justify-center rounded-full bg-purple-50 text-purple-600">
              <Package size={17} />
            </span>
          </div>
          <p className="mt-4 font-display text-3xl text-charcoal sm:text-4xl">
            {operations.variants.length}
          </p>
          <p className="mt-2 text-xs text-muted">
            Across {operations.products.length} distinct compositions
          </p>
        </div>
      </div>

      {/* Navigation Shortcuts */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Fulfillment Desk",
            description: "Update shipping & tracking",
            href: "/admin/orders",
            icon: Truck,
          },
          {
            label: "Stock & Inventory",
            description: "Location availability & adjustments",
            href: "/admin/inventory",
            icon: Boxes,
          },
          {
            label: "Products Catalogue",
            description: "Flacons, variants & pricing",
            href: "/admin/products",
            icon: Package,
          },
          {
            label: "Shoppers Directory",
            description: "Guest emails & order history",
            href: "/admin/customers",
            icon: Users,
          },
        ].map(({ label, description, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col justify-between border border-charcoal/15 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between text-charcoal/60 group-hover:text-gold">
                <Icon size={20} />
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </div>
              <h2 className="mt-4 font-display text-xl text-charcoal">{label}</h2>
              <p className="mt-1 text-xs text-muted">{description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Low Stock Warning Section (if any exist) */}
      {lowStockRecords.length > 0 && (
        <section className="border border-amber-300 bg-amber-50/50 p-6">
          <div className="flex items-center justify-between border-b border-amber-200 pb-4">
            <div className="flex items-center gap-2.5 text-amber-900 font-semibold text-sm">
              <AlertTriangle size={18} className="text-amber-600" />
              <span>Low-Stock Inventory Warnings ({lowStockRecords.length})</span>
            </div>
            <Link
              href="/admin/inventory"
              className="text-xs font-semibold tracking-wider text-amber-900 underline hover:text-amber-700 uppercase"
            >
              Resolve in Inventory →
            </Link>
          </div>
          <div className="mt-4 divide-y divide-amber-200/60">
            {lowStockRecords.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 py-3 text-xs">
                <div>
                  <span className="font-semibold text-charcoal">{item.productName}</span>
                  <span className="text-muted"> · {item.variantLabel} ({item.sku})</span>
                </div>
                <div className="flex items-center gap-5">
                  <span className="text-muted">On Hand: <b>{item.onHand}</b></span>
                  <span className="text-muted">Reserved: <b>{item.reserved}</b></span>
                  <span className="font-bold text-amber-800">Available: {item.available} (Min: {item.threshold})</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Orders Table */}
      <section className="border border-charcoal/10 bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between border-b border-charcoal/10 pb-5">
          <div>
            <h2 className="font-display text-2xl text-charcoal">Recent Customer Orders</h2>
            <p className="text-xs text-muted">
              Live incoming customer orders requiring fulfillment or dispatch.
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-semibold tracking-wider text-charcoal uppercase underline-offset-4 hover:text-gold hover:underline"
          >
            View all ({operations.orders.length}) →
          </Link>
        </div>

        {operations.orders.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-charcoal/10 text-muted uppercase tracking-wider">
                  <th className="py-3 pr-4 font-semibold">Order #</th>
                  <th className="py-3 px-4 font-semibold">Customer Email</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Fulfillment</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3 pl-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/5">
                {operations.orders.slice(0, 8).map((order) => {
                  const statusBadge = statusColors[order.status] ?? "bg-zinc-100 text-zinc-700";

                  return (
                    <tr key={order.id} className="hover:bg-ivory/50 transition-colors">
                      <td className="py-4 pr-4 font-medium font-mono text-charcoal">
                        {order.order_number}
                      </td>
                      <td className="py-4 px-4 text-charcoal">
                        {order.customer_email}
                      </td>
                      <td className="py-4 px-4 text-muted whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString("en-NG", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block border px-2.5 py-0.5 rounded-full text-[0.62rem] font-semibold tracking-wider uppercase ${statusBadge}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 capitalize text-muted">
                        {order.fulfillment_status.replace("_", " ")}
                      </td>
                      <td className="py-4 px-4 text-right font-medium text-charcoal">
                        <Money amount={Number(order.total_minor)} currency={order.currency} />
                      </td>
                      <td className="py-4 pl-4 text-right">
                        <Link
                          href="/admin/orders"
                          className="font-semibold text-gold hover:underline"
                        >
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-muted">
            <Clock size={32} className="mx-auto mb-3 text-gold/40" />
            <p className="font-display text-2xl text-charcoal">No customer orders yet</p>
            <p className="mt-1 text-xs">
              Orders placed by customers on the storefront will appear here instantly.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
