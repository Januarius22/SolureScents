"use client";

import { useState } from "react";
import {
  ChevronDown,
  MapPin,
  Truck,
  ExternalLink,
  User,
  Package,
  CreditCard,
} from "lucide-react";
import { Money, buttonClass, inputClass } from "@/components/account/account-ui";
import { updateOrder } from "@/features/admin/actions/commerce-operations";

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

export interface SerializedOrder {
  id: string;
  order_number: string;
  customer_email: string;
  total_minor: number;
  currency: string;
  status: string;
  fulfillment_status: string;
  delivery_status?: string | null;
  carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipping_address: unknown;
  created_at: string;
  items: {
    product_name: string;
    variant_label: string;
    size_ml?: number;
    quantity: number;
    unit_price_minor: number;
    currency: string;
  }[];
  payments: {
    id: string;
    status: string;
    provider: string;
    provider_reference: string | null;
    amount_minor: number;
    currency: string;
    created_at: string;
  }[];
}

interface CollapsibleOrderListProps {
  orders: SerializedOrder[];
}

export function CollapsibleOrderList({ orders }: CollapsibleOrderListProps) {
  // DEFAULT STATE: All order detail panels collapsed
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleOrder = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(orders.map((o) => o.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  if (orders.length === 0) {
    return (
      <div className="border border-dashed border-charcoal/20 bg-white p-16 text-center">
        <Truck size={32} className="mx-auto text-gold/40 mb-3" />
        <h3 className="font-display text-2xl text-charcoal">No orders found</h3>
        <p className="mt-1 text-xs text-muted">
          No orders match the current search or filter criteria. Try adjusting your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Accordion Expand/Collapse All Toolbar */}
      <div className="flex items-center justify-between text-xs text-muted pb-1">
        <span>
          Showing <b className="text-charcoal">{orders.length}</b> orders on this page
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-[11px] font-semibold text-charcoal/80 hover:text-gold uppercase tracking-wider transition"
          >
            Expand All
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-[11px] font-semibold text-charcoal/80 hover:text-gold uppercase tracking-wider transition"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Orders Accordion List */}
      <div className="space-y-3">
        {orders.map((order) => {
          const isExpanded = expandedIds.has(order.id);
          const statusBadge =
            statusBadgeClasses[order.status] ?? "bg-zinc-100 text-zinc-700 border-zinc-300";

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

          const latestPayment = order.payments[0];
          const panelId = `order-panel-${order.id}`;
          const headerId = `order-header-${order.id}`;

          return (
            <article
              key={order.id}
              className={`border transition-all duration-200 bg-white shadow-soft ${
                isExpanded ? "border-gold/60 ring-1 ring-gold/20" : "border-charcoal/15 hover:border-charcoal/30"
              }`}
            >
              {/* COLLAPSED ORDER SUMMARY (Always visible, clickable header) */}
              <button
                type="button"
                id={headerId}
                aria-expanded={isExpanded}
                aria-controls={panelId}
                onClick={() => toggleOrder(order.id)}
                className="w-full text-left p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-gold"
              >
                {/* Left section: Order #, Status badges, Customer name */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base sm:text-lg font-bold text-charcoal">
                      {order.order_number}
                    </span>

                    {/* Order Status Badge */}
                    <span
                      className={`inline-block border px-2.5 py-0.5 rounded-full text-[0.62rem] font-semibold tracking-wider uppercase ${statusBadge}`}
                    >
                      {order.status}
                    </span>

                    {/* Payment Status Badge */}
                    {latestPayment ? (
                      <span
                        className={`inline-block border px-2 py-0.5 rounded text-[0.62rem] font-semibold uppercase tracking-wider ${
                          latestPayment.status === "captured"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                            : latestPayment.status === "pending"
                            ? "border-amber-300 bg-amber-50 text-amber-800"
                            : "border-rose-300 bg-rose-50 text-rose-800"
                        }`}
                      >
                        {latestPayment.status === "captured" ? "Paid" : latestPayment.status}
                      </span>
                    ) : (
                      <span className="inline-block border border-amber-300 bg-amber-50 px-2 py-0.5 rounded text-[0.62rem] font-semibold uppercase text-amber-800">
                        Unpaid
                      </span>
                    )}

                    {/* Delivery Status Badge */}
                    <span
                      className={`inline-block border px-2 py-0.5 rounded text-[0.62rem] font-medium uppercase tracking-wider ${
                        order.delivery_status === "arranged_separately" ||
                        order.delivery_status === "pending" ||
                        !order.delivery_status
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : order.delivery_status === "configured"
                          ? "border-blue-300 bg-blue-50 text-blue-900"
                          : "border-emerald-300 bg-emerald-50 text-emerald-900"
                      }`}
                    >
                      {order.delivery_status === "arranged_separately" ||
                      order.delivery_status === "pending" ||
                      !order.delivery_status
                        ? "Delivery Arrangement Pending"
                        : order.delivery_status}
                    </span>
                  </div>

                  {/* Customer & Date */}
                  <p className="text-xs text-muted truncate">
                    <span className="font-semibold text-charcoal">
                      {recipientName ? `${recipientName} (${order.customer_email})` : order.customer_email}
                    </span>
                    <span className="mx-1.5">·</span>
                    <span>
                      {new Date(order.created_at).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </p>
                </div>

                {/* Right section: Total Amount & Expand Indicator */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-charcoal/10">
                  <div className="text-left sm:text-right">
                    <span className="block text-[10px] uppercase font-semibold text-muted tracking-wider">
                      Total
                    </span>
                    <span className="font-display text-xl sm:text-2xl font-bold text-charcoal">
                      <Money amount={order.total_minor} currency={order.currency} />
                    </span>
                  </div>

                  <div
                    className={`flex size-8 items-center justify-center rounded-full border transition-all ${
                      isExpanded
                        ? "border-gold bg-gold/10 text-gold rotate-180"
                        : "border-charcoal/20 bg-ivory text-charcoal/70"
                    }`}
                    aria-hidden="true"
                  >
                    <ChevronDown size={16} />
                  </div>
                </div>
              </button>

              {/* EXPANDED ORDER DETAILS (Accordion Panel) */}
              {isExpanded && (
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={headerId}
                  className="border-t border-charcoal/10 bg-ivory/20 p-5 sm:p-6 space-y-6"
                >
                  {/* Grid: Customer Contact & Shipping Address */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Customer Contact Details */}
                    <div className="rounded border border-charcoal/10 bg-white p-4 text-xs">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gold mb-2.5 flex items-center gap-1.5">
                        <User size={13} />
                        <span>Customer Contact</span>
                      </p>
                      <div className="space-y-1.5 text-charcoal">
                        <p className="flex items-center gap-2">
                          <span className="text-muted w-16">Name:</span>
                          <b className="font-semibold">{recipientName ?? "Guest Shopper"}</b>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="text-muted w-16">Email:</span>
                          <span className="font-mono">{order.customer_email}</span>
                        </p>
                        {phone && (
                          <p className="flex items-center gap-2">
                            <span className="text-muted w-16">Phone:</span>
                            <span className="font-mono">{phone}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Delivery Address */}
                    <div className="rounded border border-charcoal/10 bg-white p-4 text-xs">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gold mb-2.5 flex items-center gap-1.5">
                        <MapPin size={13} />
                        <span>Delivery Address</span>
                      </p>
                      <div className="space-y-1 text-charcoal/90">
                        {recipientName && <p className="font-semibold">{recipientName}</p>}
                        {addressLine1 && <p>{addressLine1}</p>}
                        {(city || state) && (
                          <p className="text-muted">
                            {[city, state].filter(Boolean).join(", ")}
                          </p>
                        )}
                        {!addressLine1 && !city && (
                          <p className="text-muted italic">Delivery address not recorded or pickup.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Purchased Perfumes Table */}
                  <div className="rounded border border-charcoal/10 bg-white p-4 text-xs">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gold mb-3 flex items-center gap-1.5">
                      <Package size={13} />
                      <span>Purchased Perfumes ({order.items.reduce((s, i) => s + i.quantity, 0)} Items)</span>
                    </p>
                    <div className="divide-y divide-charcoal/10">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 gap-2"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex size-6 items-center justify-center rounded bg-ivory font-mono text-[11px] font-bold text-charcoal">
                              ×{item.quantity}
                            </span>
                            <div>
                              <p className="font-semibold text-charcoal text-sm">{item.product_name}</p>
                              <p className="text-[11px] text-muted">
                                Size: {item.variant_label}
                                {item.size_ml ? ` · ${item.size_ml}ml flacon` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-semibold text-charcoal">
                              <Money
                                amount={item.unit_price_minor * item.quantity}
                                currency={item.currency}
                              />
                            </span>
                            <span className="block text-[10px] text-muted">
                              (<Money amount={item.unit_price_minor} currency={item.currency} /> each)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Reference & Tracking Details */}
                  <div className="grid gap-4 sm:grid-cols-2 text-xs">
                    {/* Payment Record */}
                    <div className="rounded border border-charcoal/10 bg-white p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gold mb-2.5 flex items-center gap-1.5">
                        <CreditCard size={13} />
                        <span>Payment Audit Trail</span>
                      </p>
                      {latestPayment ? (
                        <div className="space-y-1.5">
                          <p className="flex justify-between">
                            <span className="text-muted">Status:</span>
                            <span className="font-bold uppercase text-charcoal">
                              {latestPayment.status}
                            </span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted">Gateway:</span>
                            <span className="font-semibold uppercase text-charcoal">
                              {latestPayment.provider === "paystack" ? "Paystack (Test)" : latestPayment.provider}
                            </span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted">Reference:</span>
                            <span className="font-mono text-[11px] text-charcoal truncate max-w-[180px]">
                              {latestPayment.provider_reference ?? latestPayment.id}
                            </span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted">Settled Amount:</span>
                            <span className="font-mono font-bold text-charcoal">
                              <Money amount={latestPayment.amount_minor} currency={latestPayment.currency} />
                            </span>
                          </p>
                        </div>
                      ) : (
                        <p className="text-muted italic">No payment transaction record linked.</p>
                      )}
                    </div>

                    {/* Active Tracking Information */}
                    <div className="rounded border border-charcoal/10 bg-white p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gold mb-2.5 flex items-center gap-1.5">
                        <Truck size={13} />
                        <span>Fulfillment & Dispatch</span>
                      </p>
                      <div className="space-y-1.5">
                        <p className="flex justify-between">
                          <span className="text-muted">Fulfillment:</span>
                          <span className="font-semibold text-charcoal uppercase text-[11px]">
                            {order.fulfillment_status.replace("_", " ")}
                          </span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-muted">Carrier:</span>
                          <span className="font-semibold text-charcoal">
                            {order.carrier ?? "Not Assigned"}
                          </span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-muted">Tracking Code:</span>
                          <span className="font-mono text-charcoal">
                            {order.tracking_number ?? "None"}
                          </span>
                        </p>
                        {order.tracking_url && (
                          <div className="pt-1">
                            <a
                              href={order.tracking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:underline"
                            >
                              <span>Track Online</span>
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Administrative Action Form (Order State & Courier Dispatch) */}
                  <form
                    action={updateOrder}
                    className="rounded border border-charcoal/15 bg-white p-5 shadow-xs"
                  >
                    <p className="mb-3 text-[0.68rem] font-semibold tracking-[0.16em] text-gold uppercase">
                      Administrative Action: Advance Order State & Courier Dispatch
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

                      <div className="lg:col-span-1">
                        <label className="mb-1 block text-[0.62rem] font-semibold tracking-wider uppercase text-muted">
                          Internal Audit Note
                        </label>
                        <input
                          aria-label="Status note"
                          className={inputClass}
                          name="note"
                          placeholder="e.g. Handed to dispatch"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button className={buttonClass} type="submit">
                        Save Order Updates
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
