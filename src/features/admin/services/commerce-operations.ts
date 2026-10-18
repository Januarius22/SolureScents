import { requireApplicationAccess } from "@/features/auth/services/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AdminProductWithVariants {
  id: string;
  name: string;
  slug: string;
  subtitle: string | null;
  concentration: string;
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
  const db = await createServerSupabaseClient();
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

  const [productsRes, variantsRes, levelsRes, brandsRes, mediaRes] = await Promise.all([
    db.from("products").select("id, brand_id, name, slug, subtitle, concentration, status, created_at").order("name"),
    db.from("product_variants").select("id, product_id, label, sku, size_ml, price_minor, currency, is_available, low_stock_limit").order("size_ml"),
    db.from("inventory_levels").select("variant_id, on_hand, reserved"),
    db.from("brands").select("id, name"),
    db.from("product_media").select("product_id, storage_path, is_primary").order("sort_order"),
  ]);

  if (productsRes.error || variantsRes.error || levelsRes.error) {
    throw new Error("Unable to load product catalogue.", { cause: productsRes.error ?? variantsRes.error ?? levelsRes.error });
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

  return (productsRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    subtitle: p.subtitle,
    concentration: p.concentration,
    status: p.status,
    created_at: p.created_at,
    brand_name: brandsMap.get(p.brand_id) ?? "Solure Scents",
    primary_image_url: mediaByProduct.get(p.id) ?? null,
    variants: variantsByProduct.get(p.id) ?? [],
  }));
}

export async function getAdminCustomers(): Promise<AdminCustomerSummary[]> {
  await requireApplicationAccess("admin");
  const db = await createServerSupabaseClient();

  const { data: orders, error } = await db
    .from("orders")
    .select("order_number, customer_email, total_minor, currency, created_at, shipping_address, status")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load customer directory.", { cause: error });
  }

  const map = new Map<string, AdminCustomerSummary>();

  for (const o of orders ?? []) {
    const email = o.customer_email;
    if (!email) continue;

    const existing = map.get(email);
    const shipping = typeof o.shipping_address === "object" && o.shipping_address !== null
      ? (o.shipping_address as Record<string, unknown>)
      : {};

    const city = typeof shipping.city === "string" ? shipping.city : undefined;
    const country = typeof shipping.country === "string" ? shipping.country : undefined;

    if (!existing) {
      map.set(email, {
        email,
        orderCount: 1,
        totalSpentMinor: Number(o.total_minor),
        currency: o.currency,
        lastOrderDate: o.created_at,
        lastOrderNumber: o.order_number,
        shippingCity: city,
        shippingCountry: country,
      });
    } else {
      existing.orderCount += 1;
      existing.totalSpentMinor += Number(o.total_minor);
      if (!existing.shippingCity && city) existing.shippingCity = city;
      if (!existing.shippingCountry && country) existing.shippingCountry = country;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalSpentMinor - a.totalSpentMinor);
}
