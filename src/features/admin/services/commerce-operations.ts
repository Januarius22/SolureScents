import { requireApplicationAccess } from "@/features/auth/services/authorization";
import { createServerSupabaseClient, createPrivilegedSupabaseClient } from "@/lib/supabase/server";
import { resolveProductCollection } from "@/features/catalog/services/catalog-service";

export interface AdminProductWithVariants {
  id: string;
  name: string;
  slug: string;
  subtitle: string | null;
  concentration: string;
  collection?: "premium" | "regular" | null;
  status: string;
  created_at: string;
  brand_name?: string;
  primary_image_url?: string | null;
  variants: {
    id: string;
    label: string;
    sku: string;
    size_ml: number;
    price_minor: number;
    currency: string;
    is_available: boolean;
    low_stock_limit: number;
    on_hand: number;
    reserved: number;
  }[];
}

export interface AdminCustomerSummary {
  email: string;
  orderCount: number;
  totalSpentMinor: number;
  currency: string;
  lastOrderDate: string;
  lastOrderNumber: string;
  shippingCity?: string;
  shippingCountry?: string;
}

export async function getCommerceOperations() {
  await requireApplicationAccess("admin");
  const db = createPrivilegedSupabaseClient() ?? (await createServerSupabaseClient());
  const [orders, payments, levels, locations, variants, products, orderItems] = await Promise.all([
    db.from("orders").select("*").order("created_at", { ascending: false }),
    db.from("payments").select("*").order("created_at", { ascending: false }),
    db.from("inventory_levels").select("*").order("updated_at", { ascending: false }),
    db.from("inventory_locations").select("*").eq("is_active", true),
    db.from("product_variants").select("id, product_id, label, sku, size_ml, price_minor, currency, is_available, low_stock_limit"),
    db.from("products").select("id, name, slug, concentration, status"),
    db.from("order_items").select("*"),
  ]);

  for (const result of [orders, payments, levels, locations, variants, products, orderItems]) {
    if (result.error) throw new Error("Unable to load commerce operations.", { cause: result.error });
  }

  return {
    orders: orders.data ?? [],
    payments: payments.data ?? [],
    levels: levels.data ?? [],
    locations: locations.data ?? [],
    variants: variants.data ?? [],
    products: products.data ?? [],
    orderItems: orderItems.data ?? [],
  };
}

export async function getAdminProducts(): Promise<AdminProductWithVariants[]> {
  await requireApplicationAccess("admin");
  const db = await createServerSupabaseClient();

  const firstAttempt = await db
    .from("products")
    .select("id, brand_id, name, slug, subtitle, concentration, status, created_at, collection")
    .order("name");

  let rawProducts: Array<{
    id: string;
    brand_id: string;
    name: string;
    slug: string;
    subtitle: string | null;
    concentration: string | null;
    status: string;
    created_at: string;
    collection?: string | null;
  }> = [];

  let productsError = firstAttempt.error;

  if (firstAttempt.error) {
    const fallbackAttempt = await db
      .from("products")
      .select("id, brand_id, name, slug, subtitle, concentration, status, created_at")
      .order("name");
    rawProducts = (fallbackAttempt.data as typeof rawProducts) ?? [];
    productsError = fallbackAttempt.error;
  } else {
    rawProducts = (firstAttempt.data as typeof rawProducts) ?? [];
  }

  const [variantsRes, levelsRes, brandsRes, mediaRes] = await Promise.all([
    db.from("product_variants").select("id, product_id, label, sku, size_ml, price_minor, currency, is_available, low_stock_limit").order("size_ml"),
    db.from("inventory_levels").select("variant_id, on_hand, reserved"),
    db.from("brands").select("id, name"),
    db.from("product_media").select("product_id, storage_path, is_primary").order("sort_order"),
  ]);

  if (productsError || variantsRes.error || levelsRes.error) {
    throw new Error("Unable to load product catalogue.", { cause: productsError ?? variantsRes.error ?? levelsRes.error });
  }

  const brandsMap = new Map((brandsRes.data ?? []).map((b) => [b.id, b.name]));

  const mediaByProduct = new Map<string, string>();
  for (const m of mediaRes.data ?? []) {
    if (m.is_primary || !mediaByProduct.has(m.product_id)) {
      mediaByProduct.set(m.product_id, m.storage_path);
    }
  }

  const stockByVariant = new Map<string, { on_hand: number; reserved: number }>();
  for (const level of levelsRes.data ?? []) {
    const prev = stockByVariant.get(level.variant_id) ?? { on_hand: 0, reserved: 0 };
    stockByVariant.set(level.variant_id, {
      on_hand: prev.on_hand + level.on_hand,
      reserved: prev.reserved + level.reserved,
    });
  }

  const variantsByProduct = new Map<string, AdminProductWithVariants["variants"]>();
  for (const v of variantsRes.data ?? []) {
    const list = variantsByProduct.get(v.product_id) ?? [];
    const stock = stockByVariant.get(v.id) ?? { on_hand: 0, reserved: 0 };
    list.push({
      id: v.id,
      label: v.label,
      sku: v.sku,
      size_ml: Number(v.size_ml),
      price_minor: Number(v.price_minor),
      currency: v.currency,
      is_available: v.is_available,
      low_stock_limit: v.low_stock_limit,
      on_hand: stock.on_hand,
      reserved: stock.reserved,
    });
    variantsByProduct.set(v.product_id, list);
  }

  return rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    subtitle: p.subtitle,
    concentration: p.concentration ?? "EDP",
    collection: ((p as { collection?: string | null }).collection as "premium" | "regular" | null) ?? resolveProductCollection(p),
    status: p.status,
    created_at: p.created_at,
    brand_name: brandsMap.get(p.brand_id) ?? "Solure Scents",
    primary_image_url: mediaByProduct.get(p.id) ?? null,
    variants: variantsByProduct.get(p.id) ?? [],
  }));
}

export interface AdminCustomerSummary {
  email: string;
  name?: string;
  phone?: string;
  orderCount: number;
  totalSpentMinor: number;
  currency: string;
  lastOrderDate: string;
  lastOrderNumber: string;
  shippingCity?: string;
  shippingState?: string;
  shippingCountry?: string;
}

export async function getAdminCustomers(): Promise<AdminCustomerSummary[]> {
  await requireApplicationAccess("admin");
  const db = createPrivilegedSupabaseClient() ?? (await createServerSupabaseClient());

  const [ordersRes, paymentsRes] = await Promise.all([
    db
      .from("orders")
      .select("id, order_number, customer_email, total_minor, currency, created_at, shipping_address, status")
      .order("created_at", { ascending: false }),
    db
      .from("payments")
      .select("order_id, amount_minor, refunded_minor, status")
      .in("status", ["captured", "partially_refunded"]),
  ]);

  if (ordersRes.error) {
    throw new Error("Unable to load customer directory.", { cause: ordersRes.error });
  }

  // Map of order_id to authoritative captured amount
  const paidByOrderId = new Map<string, number>();
  for (const p of paymentsRes.data ?? []) {
    const netPaid = Number(p.amount_minor) - Number(p.refunded_minor || 0);
    paidByOrderId.set(p.order_id, (paidByOrderId.get(p.order_id) ?? 0) + Math.max(netPaid, 0));
  }

  const map = new Map<string, AdminCustomerSummary>();

  for (const o of ordersRes.data ?? []) {
    const rawEmail = o.customer_email?.trim();
    if (!rawEmail) continue;
    const emailKey = rawEmail.toLowerCase();

    const existing = map.get(emailKey);
    const shipping =
      typeof o.shipping_address === "object" && o.shipping_address !== null
        ? (o.shipping_address as Record<string, unknown>)
        : {};

    const name =
      typeof shipping.recipientName === "string"
        ? shipping.recipientName
        : typeof shipping.name === "string"
        ? shipping.name
        : undefined;

    const phone = typeof shipping.phone === "string" ? shipping.phone : undefined;
    const city =
      typeof shipping.cityOrLga === "string"
        ? shipping.cityOrLga
        : typeof shipping.city === "string"
        ? shipping.city
        : undefined;
    const state = typeof shipping.state === "string" ? shipping.state : undefined;
    const country = typeof shipping.country === "string" ? shipping.country : undefined;

    // Verified spending from captured payments, or fallback to total_minor if order is already confirmed/delivered
    const orderVerifiedSpent = paidByOrderId.get(o.id) ?? (["confirmed", "processing", "shipped", "delivered"].includes(o.status) ? Number(o.total_minor) : 0);

    if (!existing) {
      map.set(emailKey, {
        email: rawEmail,
        name,
        phone,
        orderCount: 1,
        totalSpentMinor: orderVerifiedSpent,
        currency: o.currency ?? "NGN",
        lastOrderDate: o.created_at,
        lastOrderNumber: o.order_number,
        shippingCity: city,
        shippingState: state,
        shippingCountry: country,
      });
    } else {
      existing.orderCount += 1;
      existing.totalSpentMinor += orderVerifiedSpent;
      if (!existing.name && name) existing.name = name;
      if (!existing.phone && phone) existing.phone = phone;
      if (!existing.shippingCity && city) existing.shippingCity = city;
      if (!existing.shippingState && state) existing.shippingState = state;
      if (!existing.shippingCountry && country) existing.shippingCountry = country;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalSpentMinor - a.totalSpentMinor);
}
