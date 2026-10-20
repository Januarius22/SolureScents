import {
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Package,
  Truck,
} from "lucide-react";
import type { Metadata } from "next";

import { Money, buttonClass, inputClass } from "@/components/account/account-ui";
import { updateOrder } from "@/features/admin/actions/commerce-operations";
import { getCommerceOperations } from "@/features/admin/services/commerce-operations";

export const metadata: Metadata = {
  title: "Order Fulfillment & Dispatch | Solure Scents Admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const statuses = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

const fulfillment = [
  "unfulfilled",
  "processing",
  "partially_fulfilled",
  "fulfilled",
  "returned",
] as const;

const statusBadgeClasses: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-300",
  confirmed: "bg-blue-100 text-blue-900 border-blue-300",
  processing: "bg-purple-100 text-purple-900 border-purple-300",
  shipped: "bg-indigo-100 text-indigo-900 border-indigo-300",
  delivered: "bg-emerald-100 text-emerald-900 border-emerald-300",
  cancelled: "bg-zinc-100 text-zinc-700 border-zinc-300",
  refunded: "bg-rose-100 text-rose-900 border-rose-300",
};

import { AdminPagination } from "@/features/admin/components/admin-pagination";

export default async function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  const params = await searchParams;
  const rawPage = typeof params.page === "string" ? params.page : undefined;
  const page =
    rawPage && !Number.isNaN(Number(rawPage)) && Number(rawPage) > 0
      ? Math.floor(Number(rawPage))
      : 1;

  const pageSize = 10;
  const { orders, payments, orderItems, variants } = await getCommerceOperations();
  const variantsById = new Map(variants.map((v) => [v.id, v]));

  const totalCount = orders.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const validPage = Math.max(1, Math.min(page, totalPages || 1));
  const pagedOrders = orders.slice(
    (validPage - 1) * pageSize,
    validPage * pageSize,
  );

  const itemsByOrder = new Map<string, typeof orderItems>();
  for (const item of orderItems) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  const paymentsByOrder = new Map<string, typeof payments>();
  for (const p of payments) {
    const list = paymentsByOrder.get(p.order_id) ?? [];
    list.push(p);
    paymentsByOrder.set(p.order_id, list);
  }

  const pendingCount = orders.filter((o) => o.status === "pending" || o.status === "confirmed").length;
  const processingCount = orders.filter((o) => o.status === "processing").length;
  const shippedCount = orders.filter((o) => o.status === "shipped").length;
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-charcoal/10 pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
            Order Fulfillment Desk
          </p>
          <h1 className="mt-2 font-display text-4xl text-charcoal sm:text-5xl">
            Orders & Shipments
          </h1>
          <p className="mt-2 text-sm text-muted">
            Manage customer dispatch, assign courier tracking numbers, and advance fulfillment states.
          </p>
        </div>

        <div className="flex items-center gap-2 border border-charcoal/15 bg-white px-4 py-2 text-xs">
          <Truck size={15} className="text-gold" />
          <span className="text-muted">Orders under care: </span>
          <b className="text-charcoal font-semibold">{orders.length} Orders</b>
        </div>
      </div>

      {/* Fulfillment Status Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-wider uppercase">New / Pending</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <p className="mt-2 font-display text-3xl text-amber-700">{pendingCount}</p>
          <p className="mt-1 text-xs text-muted">Awaiting packing or payment</p>
        </div>

        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-wider uppercase">In Processing</span>
            <Package size={16} className="text-purple-600" />
          </div>
          <p className="mt-2 font-display text-3xl text-purple-700">{processingCount}</p>
          <p className="mt-1 text-xs text-muted">Being prepared in atelier</p>
        </div>

        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-wider uppercase">In Transit</span>
            <Truck size={16} className="text-indigo-600" />
          </div>
          <p className="mt-2 font-display text-3xl text-indigo-700">{shippedCount}</p>
          <p className="mt-1 text-xs text-muted">Dispatched with courier</p>
        </div>

        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold tracking-wider uppercase">Delivered</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="mt-2 font-display text-3xl text-emerald-700">{deliveredCount}</p>
          <p className="mt-1 text-xs text-muted">Safely received by customer</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-6">
        {pagedOrders.map((order) => {
          const statusBadge = statusColors(order.status);
          const shipping =
            typeof order.shipping_address === "object" && order.shipping_address !== null
              ? (order.shipping_address as Record<string, unknown>)
              : {};

          const recipientName =
            typeof shipping.recipientName === "string"
              ? shipping.recipientName
              : typeof shipping.name === "string"
              ? shipping.name
              : undefined;
          const addressLine1 =
            typeof shipping.streetAddress === "string"
              ? shipping.streetAddress
              : typeof shipping.line1 === "string"
              ? shipping.line1
              : undefined;
          const city =
            typeof shipping.cityOrLga === "string"
              ? shipping.cityOrLga
              : typeof shipping.city === "string"
              ? shipping.city
              : undefined;
          const state = typeof shipping.state === "string" ? shipping.state : undefined;
          const phone = typeof shipping.phone === "string" ? shipping.phone : undefined;

          const orderProducts = itemsByOrder.get(order.id) ?? [];
          const orderPayments = paymentsByOrder.get(order.id) ?? [];
          const latestPayment = orderPayments[0];

          return (
            <article
              key={order.id}
              className="border border-charcoal/15 bg-white p-6 shadow-soft transition-all duration-200"
            >
              {/* Order summary header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-charcoal/10 pb-5">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-bold text-charcoal">
                      {order.order_number}
                    </span>
                    <span
                      className={`inline-block border px-2.5 py-0.5 rounded-full text-[0.62rem] font-semibold tracking-wider uppercase ${statusBadge}`}
                    >
                      {order.status}
                    </span>
                    <span className="border border-charcoal/15 bg-ivory px-2.5 py-0.5 rounded text-[0.62rem] font-medium uppercase text-charcoal/70">
                      Fulfillment: {order.fulfillment_status.replace("_", " ")}
                    </span>
                    <span className={`border px-2.5 py-0.5 rounded text-[0.62rem] font-semibold uppercase tracking-wider ${
                      order.delivery_status === "arranged_separately" || order.delivery_status === "pending"
                        ? "border-amber-300 bg-amber-50 text-amber-900"
                        : order.delivery_status === "configured"
                        ? "border-blue-300 bg-blue-50 text-blue-900"
                        : "border-emerald-300 bg-emerald-50 text-emerald-900"
                    }`}>
                      Delivery: {order.delivery_status === "arranged_separately" || order.delivery_status === "pending"
                        ? "Delivery Arrangement Pending"
                        : order.delivery_status}
                    </span>
                    {latestPayment && (
                      <span className={`border px-2.5 py-0.5 rounded text-[0.62rem] font-medium uppercase ${
                        latestPayment.status === "captured"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : latestPayment.status === "pending"
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : "border-rose-300 bg-rose-50 text-rose-800"
                      }`}>
                        Payment: {latestPayment.status} ({latestPayment.provider_reference || latestPayment.provider})
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-muted">
                    Customer: <b className="text-charcoal font-medium">{recipientName ? `${recipientName} (${order.customer_email})` : order.customer_email}</b> · Placed:{" "}
                    {new Date(order.created_at).toLocaleString("en-NG", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[0.62rem] font-semibold tracking-wider text-muted uppercase">
                    Order Total
                  </p>
                  <p className="font-display text-2xl text-charcoal">
                    <Money amount={Number(order.total_minor)} currency={order.currency} />
                  </p>
                </div>
              </div>

              {/* Purchased Fragrances, Bottle Sizes and Quantities */}
              {orderProducts.length > 0 && (
                <div className="mt-4 border-b border-charcoal/10 pb-4">
                  <p className="text-[0.62rem] font-semibold tracking-wider text-muted uppercase mb-2">
                    Purchased Fragrances ({orderProducts.reduce((s, i) => s + i.quantity, 0)} flacons)
                  </p>
                  <div className="space-y-1.5 divide-y divide-charcoal/5">
                    {orderProducts.map((item, idx) => {
                      const variant = item.variant_id ? variantsById.get(item.variant_id) : undefined;
                      return (
                        <div key={idx} className="flex items-center justify-between pt-1.5 text-xs text-charcoal">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{item.product_name}</span>
                            <span className="text-muted">
                              ({item.variant_label}{variant?.size_ml ? ` · ${variant.size_ml}ml` : ""})
                            </span>
                            <span className="rounded bg-ivory px-2 py-0.5 font-mono text-[11px] font-semibold">
                              × {item.quantity}
                            </span>
                          </div>
                          <span className="font-mono font-medium">
                            <Money amount={item.unit_price_minor * item.quantity} currency={item.currency} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Shipping Address details */}
              {(recipientName || addressLine1 || city) && (
                <div className="mt-4 flex items-start gap-2.5 rounded bg-ivory/60 p-3.5 text-xs text-charcoal/80">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-gold" />
                  <div>
                    <span className="font-semibold text-charcoal">Shipping Address: </span>
                    {recipientName && <span>{recipientName} — </span>}
                    {addressLine1 && <span>{addressLine1}, </span>}
                    {city && <span>{city}, </span>}
                    {state && <span>{state} </span>}
                    {phone && <span className="text-muted">(Phone: {phone})</span>}
                  </div>
                </div>
              )}

              {/* Active tracking information if present */}
              {order.tracking_number && (
                <div className="mt-3 flex items-center justify-between rounded border border-indigo-200 bg-indigo-50/50 p-3 text-xs text-indigo-950">
                  <div className="flex items-center gap-2">
                    <Truck size={14} className="text-indigo-600" />
                    <span>Carrier: <b>{order.carrier ?? "Standard Courier"}</b></span>
                    <span>· Tracking: <b className="font-mono">{order.tracking_number}</b></span>
                  </div>
                  {order.tracking_url && (
                    <a
                      href={order.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:underline"
                    >
                      <span>Track Online</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              )}

              {/* Order Status Update Form */}
              <form action={updateOrder} className="mt-6 border-t border-charcoal/10 pt-5">
                <p className="mb-3 text-[0.68rem] font-semibold tracking-[0.16em] text-gold uppercase">
                  Advance Order State & Courier Dispatch
                </p>

                <input name="id" type="hidden" value={order.id} />

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[0.62rem] font-semibold tracking-wider uppercase text-muted">
                      Order Status
                    </label>
                    <select
                      aria-label="Order status"
                      className={inputClass}
                      defaultValue={order.status}
                      name="status"
                    >
                      {statuses.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[0.62rem] font-semibold tracking-wider uppercase text-muted">
                      Fulfillment State
                    </label>
                    <select
                      aria-label="Fulfillment status"
                      className={inputClass}
                      defaultValue={order.fulfillment_status}
                      name="fulfillment"
                    >
                      {fulfillment.map((x) => (
                        <option key={x} value={x}>
                          {x.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[0.62rem] font-semibold tracking-wider uppercase text-muted">
                      Delivery Arrangement
                    </label>
                    <select
                      aria-label="Delivery arrangement"
                      className={inputClass}
                      defaultValue={order.delivery_status ?? "arranged_separately"}
                      name="delivery_status"
                    >
                      <option value="arranged_separately">Delivery Arrangement Pending</option>
                      <option value="pending">Pending</option>
                      <option value="configured">Configured Courier</option>
                      <option value="free">Complimentary</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[0.62rem] font-semibold tracking-wider uppercase text-muted">
                      Courier / Carrier
                    </label>
                    <input
                      aria-label="Carrier"
                      className={inputClass}
                      defaultValue={order.carrier ?? ""}
                      name="carrier"
                      placeholder="DHL / FedEx / Courier"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[0.62rem] font-semibold tracking-wider uppercase text-muted">
                      Tracking Code
                    </label>
                    <input
                      aria-label="Tracking code"
                      className={inputClass}
                      defaultValue={order.tracking_number ?? ""}
                      name="tracking"
                      placeholder="Tracking number"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="mb-1 block text-[0.62rem] font-semibold tracking-wider uppercase text-muted">
                      Tracking Link (Optional)
                    </label>
                    <input
                      aria-label="Tracking URL"
                      className={inputClass}
                      defaultValue={order.tracking_url ?? ""}
                      name="url"
                      placeholder="https://carrier.com/track/..."
                      type="url"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="mb-1 block text-[0.62rem] font-semibold tracking-wider uppercase text-muted">
                      Internal Audit Note
                    </label>
                    <input
                      aria-label="Status note"
                      className={inputClass}
                      name="note"
                      placeholder="e.g. Handed to dispatch courier"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button className={buttonClass} type="submit">
                    Save Order Updates
                  </button>
                </div>
              </form>
            </article>
          );
        })}

        {orders.length === 0 && (
          <div className="border border-dashed border-charcoal/20 bg-white p-16 text-center">
            <Truck size={32} className="mx-auto text-gold/40 mb-3" />
            <h3 className="font-display text-2xl text-charcoal">No orders currently in operations</h3>
            <p className="mt-1 text-xs text-muted">
              When shoppers complete a purchase on the storefront, their order will appear here immediately for fulfillment.
            </p>
          </div>
        )}

        <AdminPagination
          currentPage={validPage}
          pageSize={pageSize}
          totalCount={totalCount}
          baseUrl="/admin/orders"
          searchParams={{}}
          itemLabel="orders"
        />
      </div>
    </div>
  );
}

function statusColors(status: string) {
  return statusBadgeClasses[status] ?? "bg-zinc-100 text-zinc-700 border-zinc-300";
}
