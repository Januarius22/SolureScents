import { requireApplicationAccess } from "@/features/auth/services/authorization";
import { createServerSupabaseClient, createPrivilegedSupabaseClient } from "@/lib/supabase/server";

export interface DailyMetric {
  date: string;
  orders: number;
  revenueMinor: number;
}

export interface BestSellingProduct {
  name: string;
  unitsSold: number;
  revenueMinor: number;
}

export interface LowStockAlert {
  productName: string;
  variantLabel: string;
  sku: string;
  onHand: number;
  reserved: number;
  available: number;
  limit: number;
}

export interface RecentTransaction {
  id: string;
  orderNumber?: string;
  amountMinor: number;
  currency: string;
  status: string;
  provider: string;
  reference?: string;
  createdAt: string;
}

export interface AnalyticsSnapshot {
  currency: string;
  daily: DailyMetric[];
  orders: number;
  pendingOrdersCount: number;
  grossCapturedMinor: number;
  refundsMinor: number;
  netRevenueMinor: number;
  averageOrderMinor: number;
  revenue: number;
  captured: number;
  averageOrder: number;
  activeProducts: number;
  customers: number;
  recentTransactions: RecentTransaction[];
  bestSellingPerfumes: BestSellingProduct[];
  lowStockProducts: LowStockAlert[];
}

/**
 * Builds an authoritative operational and financial snapshot.
 * Strict Revenue Invariant:
 * - Count ONLY successfully captured payments.
 * - Exclude pending and failed payments.
 * - Account for full and partial refunds.
 * - Exclude manually confirmed unpaid orders from revenue.
 */
export async function getAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  await requireApplicationAccess("admin");
  const db = createPrivilegedSupabaseClient() ?? (await createServerSupabaseClient());
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 29);
  since.setUTCHours(0, 0, 0, 0);

  const [ordersRes, productsRes, profilesRes, paymentsRes, orderItemsRes, levelsRes, variantsRes] =
    await Promise.all([
      db
        .from("orders")
        .select("id, order_number, status, total_minor, currency, created_at")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false }),
      db.from("products").select("id, name, status").eq("status", "active"),
      db.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
      db
        .from("payments")
        .select("id, order_id, provider, provider_reference, status, amount_minor, refunded_minor, currency, created_at")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false }),
      db.from("order_items").select("order_id, product_name, variant_label, quantity, unit_price_minor"),
      db.from("inventory_levels").select("id, variant_id, on_hand, reserved"),
      db.from("product_variants").select("id, product_id, label, sku, low_stock_limit"),
    ]);

  for (const res of [ordersRes, paymentsRes]) {
    if (res.error) throw new Error("Unable to load analytics data.", { cause: res.error });
  }

  const orders = ordersRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const products = productsRes.data ?? [];
  const orderItems = orderItemsRes.data ?? [];
  const levels = levelsRes.data ?? [];
  const variants = variantsRes.data ?? [];

  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const primaryCurrency = orders[0]?.currency ?? payments[0]?.currency ?? "NGN";

  // Authoritative payment categorization
  const capturedPayments = payments.filter((p) =>
    ["captured", "partially_refunded"].includes(p.status),
  );

  const paidOrderIds = new Set(capturedPayments.map((p) => p.order_id).filter(Boolean) as string[]);

  // Financial calculations
  const grossCapturedMinor = capturedPayments.reduce((s, p) => s + (p.amount_minor || 0), 0);
  const refundsMinor = payments.reduce((s, p) => s + (p.refunded_minor || 0), 0);
  const netRevenueMinor = Math.max(0, grossCapturedMinor - refundsMinor);

  // Paid orders list
  const paidOrders = orders.filter((o) => paidOrderIds.has(o.id));
  const paidOrderCount = paidOrders.length;
  const pendingOrdersCount = orders.filter((o) => o.status === "pending").length;

  const averageOrderMinor = paidOrderCount > 0 ? Math.round(netRevenueMinor / paidOrderCount) : 0;

  // Daily revenue metrics over 30 days
  const daily = new Map<string, DailyMetric>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    const date = d.toISOString().slice(0, 10);
    daily.set(date, { date, orders: 0, revenueMinor: 0 });
  }

  const dailyOrderCounted = new Set<string>();
  for (const p of capturedPayments) {
    const date = p.created_at.slice(0, 10);
    const m = daily.get(date);
    if (m) {
      const net = (p.amount_minor || 0) - (p.refunded_minor || 0);
      m.revenueMinor += net;
      const orderKey = `${date}:${p.order_id}`;
      if (!dailyOrderCounted.has(orderKey)) {
        dailyOrderCounted.add(orderKey);
        m.orders += 1;
      }
    }
  }

  // Best-selling perfumes from paid orders
  const salesByProduct = new Map<string, { unitsSold: number; revenueMinor: number }>();
  for (const item of orderItems) {
    if (paidOrderIds.has(item.order_id)) {
      const name = item.product_name || "Fragrance";
      const existing = salesByProduct.get(name) ?? { unitsSold: 0, revenueMinor: 0 };
      existing.unitsSold += item.quantity || 1;
      existing.revenueMinor += (item.unit_price_minor || 0) * (item.quantity || 1);
      salesByProduct.set(name, existing);
    }
  }

  const bestSellingPerfumes: BestSellingProduct[] = Array.from(salesByProduct.entries())
    .map(([name, data]) => ({
      name,
      unitsSold: data.unitsSold,
      revenueMinor: data.revenueMinor,
    }))
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 5);

  // Low stock products calculation
  const variantMap = new Map(variants.map((v) => [v.id, v]));
  const productMap = new Map(products.map((p) => [p.id, p]));
  const lowStockProducts: LowStockAlert[] = [];

  for (const lvl of levels) {
    const v = variantMap.get(lvl.variant_id);
    const p = v ? productMap.get(v.product_id) : undefined;
    const available = (lvl.on_hand || 0) - (lvl.reserved || 0);
    const limit = v?.low_stock_limit ?? 5;
    if (available <= limit) {
      lowStockProducts.push({
        productName: p?.name ?? "Fragrance",
        variantLabel: v?.label ?? "Variant",
        sku: v?.sku ?? "SKU",
        onHand: lvl.on_hand || 0,
        reserved: lvl.reserved || 0,
        available,
        limit,
      });
    }
  }

  // Recent transactions list
  const recentTransactions: RecentTransaction[] = payments.slice(0, 8).map((p) => ({
    id: p.id,
    orderNumber: p.order_id ? orderMap.get(p.order_id)?.order_number : undefined,
    amountMinor: p.amount_minor,
    currency: p.currency || primaryCurrency,
    status: p.status,
    provider: p.provider,
    reference: p.provider_reference || undefined,
    createdAt: p.created_at,
  }));

  return {
    currency: primaryCurrency,
    daily: [...daily.values()],
    orders: paidOrderCount,
    pendingOrdersCount,
    grossCapturedMinor,
    refundsMinor,
    netRevenueMinor,
    averageOrderMinor,
    revenue: netRevenueMinor,
    captured: grossCapturedMinor,
    averageOrder: averageOrderMinor,
    activeProducts: productsRes.data?.length ?? products.length,
    customers: profilesRes.count ?? 0,
    recentTransactions,
    bestSellingPerfumes,
    lowStockProducts,
  };
}

