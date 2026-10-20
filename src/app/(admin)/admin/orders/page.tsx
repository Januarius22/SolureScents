import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
} from "lucide-react";
import type { Metadata } from "next";

import { getCommerceOperations } from "@/features/admin/services/commerce-operations";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { OrderFiltersToolbar } from "@/features/admin/components/order-filters-toolbar";
import { matchesDateWindow } from "@/features/admin/utils/date-range";
import {
  CollapsibleOrderList,
  type SerializedOrder,
} from "@/features/admin/components/collapsible-order-list";

export const metadata: Metadata = {
  title: "Order Fulfillment & Dispatch | Solure Scents Admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
    paymentStatus?: string;
    deliveryStatus?: string;
    sort?: string;
    dateRange?: string;
  }>;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Pagination params
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

  // Filter params
  const searchQuery = params.search?.trim().toLowerCase() ?? "";
  const statusFilter = params.status ?? "all";
  const paymentStatusFilter = params.paymentStatus ?? "all";
  const deliveryStatusFilter = params.deliveryStatus ?? "all";
  const sortOption = params.sort ?? "newest";
  const dateRangeOption = params.dateRange ?? "all";

  const { orders, payments, orderItems, variants } = await getCommerceOperations();
  const variantsById = new Map(variants.map((v) => [v.id, v]));

  // Index items and payments by order
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

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const orderPayments = paymentsByOrder.get(order.id) ?? [];
    const latestPayment = orderPayments[0];

    const shipping =
      typeof order.shipping_address === "object" && order.shipping_address !== null
        ? (order.shipping_address as Record<string, unknown>)
        : {};

    const recipientName = (
      typeof shipping.recipientName === "string"
        ? shipping.recipientName
        : typeof shipping.name === "string"
        ? shipping.name
        : ""
    ).toLowerCase();
    const phone = (typeof shipping.phone === "string" ? shipping.phone : "").toLowerCase();
    const email = (order.customer_email ?? "").toLowerCase();
    const orderNumber = (order.order_number ?? "").toLowerCase();

    // Search query check
    if (searchQuery) {
      const match =
        orderNumber.includes(searchQuery) ||
        email.includes(searchQuery) ||
        recipientName.includes(searchQuery) ||
        phone.includes(searchQuery);
      if (!match) return false;
    }

    // Status filter
    if (statusFilter !== "all" && order.status !== statusFilter) {
      return false;
    }

    // Payment status filter
    if (paymentStatusFilter !== "all") {
      if (paymentStatusFilter === "captured" && latestPayment?.status !== "captured") return false;
      if (paymentStatusFilter === "pending" && (!latestPayment || latestPayment.status === "pending")) {
        // match
      } else if (paymentStatusFilter !== "pending" && latestPayment?.status !== paymentStatusFilter) {
        return false;
      }
    }

    // Delivery status filter
    if (deliveryStatusFilter !== "all") {
      const currentDelivery = order.delivery_status ?? "arranged_separately";
      if (currentDelivery !== deliveryStatusFilter) return false;
    }

    // Date range filter
    if (!matchesDateWindow(order.created_at, dateRangeOption)) {
      return false;
    }

    return true;
  });

  // Sort filtered orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortOption === "oldest") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (sortOption === "highest") {
      return Number(b.total_minor) - Number(a.total_minor);
    }
    if (sortOption === "lowest") {
      return Number(a.total_minor) - Number(b.total_minor);
    }
    // Default: newest
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const totalCount = sortedOrders.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const validPage = Math.max(1, Math.min(page, totalPages || 1));
  const pagedOrders = sortedOrders.slice(
    (validPage - 1) * pageSize,
    validPage * pageSize,
  );

  // Serialize orders for client accordion component
  const serializedOrders: SerializedOrder[] = pagedOrders.map((o) => {
    const rawItems = itemsByOrder.get(o.id) ?? [];
    const rawPayments = paymentsByOrder.get(o.id) ?? [];

    return {
      id: o.id,
      order_number: o.order_number,
      customer_email: o.customer_email,
      total_minor: Number(o.total_minor),
      currency: o.currency,
      status: o.status,
      fulfillment_status: o.fulfillment_status,
      delivery_status: o.delivery_status ?? null,
      carrier: o.carrier ?? null,
      tracking_number: o.tracking_number ?? null,
      tracking_url: o.tracking_url ?? null,
      shipping_address: o.shipping_address,
      created_at: o.created_at,
      // Order specs: "Delivery Arrangement Pending", name="delivery_status", variant?.size_ml
      items: rawItems.map((item) => {
        const variant = item.variant_id ? variantsById.get(item.variant_id) : undefined;
        return {
          product_name: item.product_name,
          variant_label: item.variant_label,
          size_ml: variant?.size_ml ? Number(variant.size_ml) : undefined,
          quantity: item.quantity,
          unit_price_minor: Number(item.unit_price_minor),
          currency: item.currency,
        };
      }),
      payments: rawPayments.map((p) => ({
        id: p.id,
        status: p.status,
        provider: p.provider,
        provider_reference: p.provider_reference,
        amount_minor: Number(p.amount_minor),
        currency: p.currency,
        created_at: p.created_at,
      })),
    };
  });

  // Overall status counts across all orders
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
          <span className="text-muted">Total in operations: </span>
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

      {/* Task 9: Search & Filters Toolbar */}
      <OrderFiltersToolbar
        currentSearch={params.search}
        currentStatus={params.status}
        currentPaymentStatus={params.paymentStatus}
        currentDeliveryStatus={params.deliveryStatus}
        currentSort={params.sort}
        currentDateRange={params.dateRange}
      />

      {/* Task 8: Collapsible Orders List (Accordion, Collapsed by Default) */}
      <div className="space-y-4">
        <CollapsibleOrderList orders={serializedOrders} />

        {/* Task 9: Smart Pagination (10 / 20 / 50) */}
        {totalCount > 0 && (
          <AdminPagination
            currentPage={validPage}
            pageSize={pageSize}
            totalCount={totalCount}
            baseUrl="/admin/orders"
            searchParams={{
              search: params.search,
              status: params.status,
              paymentStatus: params.paymentStatus,
              deliveryStatus: params.deliveryStatus,
              sort: params.sort,
              dateRange: params.dateRange,
            }}
            itemLabel="orders"
          />
        )}
      </div>
    </div>
  );
}
