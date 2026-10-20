import { requireApplicationAccess } from "@/features/auth/services/authorization";
import { createServerSupabaseClient, createPrivilegedSupabaseClient } from "@/lib/supabase/server";
import {
  resolveDateRange,
  calculatePeriodChange,
  type ResolvedDateRange,
} from "../utils/date-range";

export interface TimeSeriesPoint {
  key: string;
  label: string;
  orders: number;
  revenueMinor: number;
}

export interface BestSellingProduct {
  name: string;
  unitsSold: number;
  revenueMinor: number;
  percentageOfTotal: number;
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
  customerEmail?: string;
  amountMinor: number;
  currency: string;
  status: string;
  provider: string;
  reference?: string;
  createdAt: string;
}

export interface MetricComparison {
  value: number;
  previousValue: number;
  percentChange: number;
  isPositive: boolean;
  isNeutral: boolean;
}

export interface OrderStatusBreakdown {
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

export interface PaymentPerformanceBreakdown {
  capturedCount: number;
  capturedMinor: number;
  pendingCount: number;
  pendingMinor: number;
  failedCount: number;
  failedMinor: number;
  refundedCount: number;
  refundedMinor: number;
}

export interface InventoryHealthSummary {
  outOfStockCount: number;
  lowStockCount: number;
  healthyStockCount: number;
  totalAvailableUnits: number;
}

export interface AnalyticsSnapshot {
  currency: string;
  range: ResolvedDateRange;

  // Primary Business KPIs with Period-over-Period comparisons
  grossCaptured: MetricComparison;
  refunds: MetricComparison;
  netRevenue: MetricComparison;
  paidOrders: MetricComparison;
  averageOrderValue: MetricComparison;
  totalUnitsSold: MetricComparison;
  newCustomers: MetricComparison;
  lowStockAlertsCount: number;

  // Visualizations & Breakdowns
  timeSeries: TimeSeriesPoint[];
  bestSellingPerfumes: BestSellingProduct[];
  orderStatusOverview: OrderStatusBreakdown;
  inventoryHealth: InventoryHealthSummary;
  paymentPerformance: PaymentPerformanceBreakdown;
  lowStockProducts: LowStockAlert[];
  recentTransactions: RecentTransaction[];

  // Legacy compatibility fields
  daily: { date: string; orders: number; revenueMinor: number }[];
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
}

export interface GetAnalyticsOptions {
  range?: string | null;
  from?: string | null;
  to?: string | null;
}

/**
 * Builds an authoritative operational and financial snapshot.
 * Strict Revenue Invariant:
 * - Count ONLY successfully captured payments (captured & partially_refunded).
 * - Exclude pending and failed payments.
 * - Deduct full and partial refunds from net revenue.
 * - Exclude uncaptured/unpaid orders from revenue figures.
 */
export async function getAnalyticsSnapshot(
  options: GetAnalyticsOptions = {},
): Promise<AnalyticsSnapshot> {
  await requireApplicationAccess("admin");
  const db = createPrivilegedSupabaseClient() ?? (await createServerSupabaseClient());

  const dateRange = resolveDateRange(options.range, options.from, options.to);
  const { startDate, endDate, previousStartDate, previousEndDate } = dateRange;

  // Fetch all orders and payments starting from previousStartDate to satisfy both current and comparison periods
  const [
    ordersRes,
    productsRes,
    profilesRes,
    paymentsRes,
    orderItemsRes,
    levelsRes,
    variantsRes,
    allTimeOrdersRes,
  ] = await Promise.all([
    db
      .from("orders")
      .select("id, order_number, customer_email, status, total_minor, currency, created_at")
      .gte("created_at", previousStartDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false }),
    db.from("products").select("id, name, status").eq("status", "active"),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
    db
      .from("payments")
      .select("id, order_id, provider, provider_reference, status, amount_minor, refunded_minor, currency, created_at, customer_email")
      .gte("created_at", previousStartDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false }),
    db
      .from("order_items")
      .select("id, order_id, product_name, variant_label, quantity, unit_price_minor, line_total_minor"),
    db.from("inventory_levels").select("id, variant_id, on_hand, reserved"),
    db.from("product_variants").select("id, product_id, label, sku, low_stock_limit"),
    // Fetch customer earliest order timestamps to calculate real new customers vs returning
    db
      .from("orders")
      .select("customer_email, created_at")
      .order("created_at", { ascending: true }),
  ]);

  if (ordersRes.error) throw new Error("Unable to load orders analytics.", { cause: ordersRes.error });
  if (paymentsRes.error) throw new Error("Unable to load payments analytics.", { cause: paymentsRes.error });

  const rawOrders = ordersRes.data ?? [];
  const rawPayments = paymentsRes.data ?? [];
  const products = productsRes.data ?? [];
  const orderItems = orderItemsRes.data ?? [];
  const levels = levelsRes.data ?? [];
  const variants = variantsRes.data ?? [];
  const allTimeOrders = allTimeOrdersRes.data ?? [];

  const primaryCurrency = rawOrders[0]?.currency ?? rawPayments[0]?.currency ?? "NGN";

  // Build first order date map per customer email
  const customerFirstOrderMap = new Map<string, Date>();
  for (const o of allTimeOrders) {
    const email = o.customer_email?.trim().toLowerCase();
    if (email && !customerFirstOrderMap.has(email)) {
      customerFirstOrderMap.set(email, new Date(o.created_at));
    }
  }

  // Filter current vs previous period records
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  const prevStartMs = previousStartDate.getTime();
  const prevEndMs = previousEndDate.getTime();

  const currentPayments = rawPayments.filter((p) => {
    const t = new Date(p.created_at).getTime();
    return t >= startMs && t <= endMs;
  });

  const prevPayments = rawPayments.filter((p) => {
    const t = new Date(p.created_at).getTime();
    return t >= prevStartMs && t <= prevEndMs;
  });

  const currentOrders = rawOrders.filter((o) => {
    const t = new Date(o.created_at).getTime();
    return t >= startMs && t <= endMs;
  });

  // Calculate Authoritative Captured Payments
  const isCapturedPayment = (p: { status: string }) =>
    ["captured", "partially_refunded"].includes(p.status);

  const curCapturedPayments = currentPayments.filter(isCapturedPayment);
  const prevCapturedPayments = prevPayments.filter(isCapturedPayment);

  // Distinct paid orders
  const curPaidOrderIds = new Set(curCapturedPayments.map((p) => p.order_id).filter(Boolean) as string[]);
  const prevPaidOrderIds = new Set(prevCapturedPayments.map((p) => p.order_id).filter(Boolean) as string[]);

  // 1. Gross Captured Sales
  const curGrossCapturedMinor = curCapturedPayments.reduce((s, p) => s + (p.amount_minor || 0), 0);
  const prevGrossCapturedMinor = prevCapturedPayments.reduce((s, p) => s + (p.amount_minor || 0), 0);
  const grossChange = calculatePeriodChange(curGrossCapturedMinor, prevGrossCapturedMinor);

  // 2. Refunds
  const curRefundsMinor = currentPayments.reduce((s, p) => s + (p.refunded_minor || 0), 0);
  const prevRefundsMinor = prevPayments.reduce((s, p) => s + (p.refunded_minor || 0), 0);
  const refundsChange = calculatePeriodChange(curRefundsMinor, prevRefundsMinor);

  // 3. Net Revenue
  const curNetRevenueMinor = Math.max(0, curGrossCapturedMinor - curRefundsMinor);
  const prevNetRevenueMinor = Math.max(0, prevGrossCapturedMinor - prevRefundsMinor);
  const netRevenueChange = calculatePeriodChange(curNetRevenueMinor, prevNetRevenueMinor);

  // 4. Paid Orders Count
  const curPaidOrderCount = curPaidOrderIds.size;
  const prevPaidOrderCount = prevPaidOrderIds.size;
  const paidOrdersChange = calculatePeriodChange(curPaidOrderCount, prevPaidOrderCount);

  // 5. Average Order Value
  const curAOVMinor = curPaidOrderCount > 0 ? Math.round(curNetRevenueMinor / curPaidOrderCount) : 0;
  const prevAOVMinor = prevPaidOrderCount > 0 ? Math.round(prevNetRevenueMinor / prevPaidOrderCount) : 0;
  const aovChange = calculatePeriodChange(curAOVMinor, prevAOVMinor);

  // 6. Total Units Sold (from paid orders)
  let curUnitsSold = 0;
  let prevUnitsSold = 0;
  for (const item of orderItems) {
    if (curPaidOrderIds.has(item.order_id)) {
      curUnitsSold += item.quantity || 1;
    }
    if (prevPaidOrderIds.has(item.order_id)) {
      prevUnitsSold += item.quantity || 1;
    }
  }
  const unitsSoldChange = calculatePeriodChange(curUnitsSold, prevUnitsSold);

  // 7. New Customers in Period
  let curNewCustomers = 0;
  let prevNewCustomers = 0;
  for (const [, firstDate] of customerFirstOrderMap.entries()) {
    const t = firstDate.getTime();
    if (t >= startMs && t <= endMs) {
      curNewCustomers += 1;
    }
    if (t >= prevStartMs && t <= prevEndMs) {
      prevNewCustomers += 1;
    }
  }
  const newCustomersChange = calculatePeriodChange(curNewCustomers, prevNewCustomers);

  // 8. Low-Stock Alerts (Current State)
  const variantMap = new Map(variants.map((v) => [v.id, v]));
  const productMap = new Map(products.map((p) => [p.id, p]));
  const lowStockProducts: LowStockAlert[] = [];
  let outOfStockCount = 0;
  let lowStockCount = 0;
  let healthyStockCount = 0;
  let totalAvailableUnits = 0;

  for (const lvl of levels) {
    const v = variantMap.get(lvl.variant_id);
    const p = v ? productMap.get(v.product_id) : undefined;
    const available = Math.max(0, (lvl.on_hand || 0) - (lvl.reserved || 0));
    const limit = v?.low_stock_limit ?? 5;
    totalAvailableUnits += available;

    if (available === 0) {
      outOfStockCount += 1;
      lowStockProducts.push({
        productName: p?.name ?? "Fragrance",
        variantLabel: v?.label ?? "Edition",
        sku: v?.sku ?? "SKU",
        onHand: lvl.on_hand || 0,
        reserved: lvl.reserved || 0,
        available,
        limit,
      });
    } else if (available <= limit) {
      lowStockCount += 1;
      lowStockProducts.push({
        productName: p?.name ?? "Fragrance",
        variantLabel: v?.label ?? "Edition",
        sku: v?.sku ?? "SKU",
        onHand: lvl.on_hand || 0,
        reserved: lvl.reserved || 0,
        available,
        limit,
      });
    } else {
      healthyStockCount += 1;
    }
  }

  // Adaptive Time-Series Generation based on granularity
  const timeSeriesMap = new Map<string, TimeSeriesPoint>();

  if (dateRange.granularity === "monthly") {
    // Bucket by Year-Month (e.g. "2026-01")
    const d = new Date(startDate);
    while (d <= endDate) {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const key = `${year}-${month}`;
      const label = d.toLocaleDateString("en-NG", { month: "short", year: "numeric", timeZone: "Africa/Lagos" });
      if (!timeSeriesMap.has(key)) {
        timeSeriesMap.set(key, { key, label, orders: 0, revenueMinor: 0 });
      }
      d.setUTCMonth(d.getUTCMonth() + 1);
    }
  } else if (dateRange.granularity === "weekly") {
    // Bucket into 7-day windows
    let cursor = new Date(startDate);
    let weekIndex = 1;
    while (cursor <= endDate) {
      const nextWeek = new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      const key = cursor.toISOString().slice(0, 10);
      const label = `Wk ${weekIndex} (${cursor.toLocaleDateString("en-NG", { month: "short", day: "numeric", timeZone: "Africa/Lagos" })})`;
      timeSeriesMap.set(key, { key, label, orders: 0, revenueMinor: 0 });
      cursor = new Date(nextWeek.getTime() + 1);
      weekIndex++;
    }
  } else {
    // Daily buckets (Lagos local days)
    let cursor = new Date(startDate);
    while (cursor <= endDate) {
      const lagosD = new Date(cursor.getTime() + 1 * 60 * 60 * 1000);
      const key = lagosD.toISOString().slice(0, 10);
      const label = lagosD.toLocaleDateString("en-NG", { month: "short", day: "numeric", timeZone: "Africa/Lagos" });
      if (!timeSeriesMap.has(key)) {
        timeSeriesMap.set(key, { key, label, orders: 0, revenueMinor: 0 });
      }
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  // Populate time series from captured payments
  const countedOrdersInBucket = new Set<string>();
  for (const p of curCapturedPayments) {
    const pDate = new Date(new Date(p.created_at).getTime() + 1 * 60 * 60 * 1000);
    let targetKey = "";

    if (dateRange.granularity === "monthly") {
      targetKey = `${pDate.getUTCFullYear()}-${String(pDate.getUTCMonth() + 1).padStart(2, "0")}`;
    } else if (dateRange.granularity === "weekly") {
      // Find matching week bucket
      for (const bucketKey of timeSeriesMap.keys()) {
        const bucketStart = new Date(bucketKey).getTime();
        const bucketEnd = bucketStart + 7 * 24 * 60 * 60 * 1000;
        const pt = new Date(p.created_at).getTime();
        if (pt >= bucketStart && pt < bucketEnd) {
          targetKey = bucketKey;
          break;
        }
      }
    } else {
      targetKey = pDate.toISOString().slice(0, 10);
    }

    const bucket = timeSeriesMap.get(targetKey);
    if (bucket) {
      const net = (p.amount_minor || 0) - (p.refunded_minor || 0);
      bucket.revenueMinor += net;
      const orderKey = `${targetKey}:${p.order_id}`;
      if (p.order_id && !countedOrdersInBucket.has(orderKey)) {
        countedOrdersInBucket.add(orderKey);
        bucket.orders += 1;
      }
    }
  }

  // Best-selling perfumes in current period
  const salesByProduct = new Map<string, { unitsSold: number; revenueMinor: number }>();
  for (const item of orderItems) {
    if (curPaidOrderIds.has(item.order_id)) {
      const name = item.product_name || "Solure Fragrance";
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
      percentageOfTotal: curUnitsSold > 0 ? Math.round((data.unitsSold / curUnitsSold) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 5);

  // Order status overview in period
  const orderStatusOverview: OrderStatusBreakdown = {
    pending: currentOrders.filter((o) => o.status === "pending").length,
    confirmed: currentOrders.filter((o) => o.status === "confirmed").length,
    processing: currentOrders.filter((o) => o.status === "processing").length,
    shipped: currentOrders.filter((o) => o.status === "shipped").length,
    delivered: currentOrders.filter((o) => o.status === "delivered").length,
    cancelled: currentOrders.filter((o) => o.status === "cancelled").length,
  };

  // Payment performance in period
  const paymentPerformance: PaymentPerformanceBreakdown = {
    capturedCount: curCapturedPayments.length,
    capturedMinor: curGrossCapturedMinor,
    pendingCount: currentPayments.filter((p) => p.status === "pending").length,
    pendingMinor: currentPayments.filter((p) => p.status === "pending").reduce((s, p) => s + (p.amount_minor || 0), 0),
    failedCount: currentPayments.filter((p) => p.status === "failed").length,
    failedMinor: currentPayments.filter((p) => p.status === "failed").reduce((s, p) => s + (p.amount_minor || 0), 0),
    refundedCount: currentPayments.filter((p) => ["refunded", "partially_refunded"].includes(p.status)).length,
    refundedMinor: curRefundsMinor,
  };

  const orderMap = new Map(currentOrders.map((o) => [o.id, o]));
  const recentTransactions: RecentTransaction[] = currentPayments.slice(0, 10).map((p) => {
    const ord = p.order_id ? orderMap.get(p.order_id) : undefined;
    return {
      id: p.id,
      orderNumber: ord?.order_number,
      customerEmail: p.customer_email || ord?.customer_email,
      amountMinor: p.amount_minor,
      currency: p.currency || primaryCurrency,
      status: p.status,
      provider: p.provider,
      reference: p.provider_reference || undefined,
      createdAt: p.created_at,
    };
  });

  return {
    currency: primaryCurrency,
    range: dateRange,

    grossCaptured: {
      value: curGrossCapturedMinor,
      previousValue: prevGrossCapturedMinor,
      percentChange: grossChange.percent,
      isPositive: grossChange.isPositive,
      isNeutral: grossChange.isNeutral,
    },
    refunds: {
      value: curRefundsMinor,
      previousValue: prevRefundsMinor,
      percentChange: refundsChange.percent,
      isPositive: refundsChange.isPositive,
      isNeutral: refundsChange.isNeutral,
    },
    netRevenue: {
      value: curNetRevenueMinor,
      previousValue: prevNetRevenueMinor,
      percentChange: netRevenueChange.percent,
      isPositive: netRevenueChange.isPositive,
      isNeutral: netRevenueChange.isNeutral,
    },
    paidOrders: {
      value: curPaidOrderCount,
      previousValue: prevPaidOrderCount,
      percentChange: paidOrdersChange.percent,
      isPositive: paidOrdersChange.isPositive,
      isNeutral: paidOrdersChange.isNeutral,
    },
    averageOrderValue: {
      value: curAOVMinor,
      previousValue: prevAOVMinor,
      percentChange: aovChange.percent,
      isPositive: aovChange.isPositive,
      isNeutral: aovChange.isNeutral,
    },
    totalUnitsSold: {
      value: curUnitsSold,
      previousValue: prevUnitsSold,
      percentChange: unitsSoldChange.percent,
      isPositive: unitsSoldChange.isPositive,
      isNeutral: unitsSoldChange.isNeutral,
    },
    newCustomers: {
      value: curNewCustomers,
      previousValue: prevNewCustomers,
      percentChange: newCustomersChange.percent,
      isPositive: newCustomersChange.isPositive,
      isNeutral: newCustomersChange.isNeutral,
    },
    lowStockAlertsCount: lowStockProducts.length,

    timeSeries: Array.from(timeSeriesMap.values()),
    bestSellingPerfumes,
    orderStatusOverview,
    inventoryHealth: {
      outOfStockCount,
      lowStockCount,
      healthyStockCount,
      totalAvailableUnits,
    },
    paymentPerformance,
    lowStockProducts,
    recentTransactions,

    // Legacy fields for backward compatibility
    daily: Array.from(timeSeriesMap.values()).map((p) => ({
      date: p.key,
      orders: p.orders,
      revenueMinor: p.revenueMinor,
    })),
    orders: curPaidOrderCount,
    pendingOrdersCount: orderStatusOverview.pending,
    grossCapturedMinor: curGrossCapturedMinor,
    refundsMinor: curRefundsMinor,
    netRevenueMinor: curNetRevenueMinor,
    averageOrderMinor: curAOVMinor,
    revenue: curNetRevenueMinor,
    captured: curGrossCapturedMinor,
    averageOrder: curAOVMinor,
    activeProducts: products.length,
    customers: profilesRes.count ?? 0,
  };
}
