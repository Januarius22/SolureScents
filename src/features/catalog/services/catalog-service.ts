import { cache } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  FragranceConcentration,
  ProductSummary,
  ProductVariantSummary,
} from "@/features/catalog/types/catalog";
import { productFiltersSchema, type ProductFilters } from "@/features/catalog/validation/catalog";

export interface PaginatedProducts {
  items: ProductSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CatalogFacetOption {
  id: string;
  name: string;
}

export interface CatalogFacets {
  brands: CatalogFacetOption[];
  collections: CatalogFacetOption[];
  families: CatalogFacetOption[];
}

/** Supplies the public filter labels while keeping catalogue controls tied to live data. */
export const getCatalogFacets = cache(async (): Promise<CatalogFacets> => {
  const supabase = await createServerSupabaseClient();
  const [brandsResult, collectionsResult, familiesResult] = await Promise.all([
    supabase.from("brands").select("id, name").eq("is_active", true).order("sort_order").order("name"),
    supabase.from("collections").select("id, name").eq("is_active", true).order("sort_order").order("name"),
    supabase.from("fragrance_families").select("id, name").order("name"),
  ]);

  const error = brandsResult.error ?? collectionsResult.error ?? familiesResult.error;
  if (error) throw new Error("Unable to load catalogue filters.", { cause: error });

  return {
    brands: brandsResult.data ?? [],
    collections: collectionsResult.data ?? [],
    families: familiesResult.data ?? [],
  };
});

/**
 * Resolves perfume collection tier ('premium' | 'regular') with graceful
 * fallback when the database column is not yet present on hosted products table.
 */
export function resolveProductCollection(product: {
  collection?: string | null;
  name?: string;
  subtitle?: string | null;
  description?: string | null;
}): "premium" | "regular" {
  if (product.collection === "premium" || product.collection === "regular") {
    return product.collection;
  }
  const text = `${product.name || ""} ${product.subtitle || ""} ${product.description || ""}`.toLowerCase();
  if (
    text.includes("khalifa") ||
    text.includes("oud") ||
    text.includes("extrait") ||
    text.includes("royal") ||
    text.includes("imperial") ||
    text.includes("luxury") ||
    text.includes("signature")
  ) {
    return "premium";
  }
  return "regular";
}

/** Reads the public catalogue through RLS-filtered product and variant queries. */
export async function listPublishedProducts(input: ProductFilters): Promise<PaginatedProducts> {
  const filters = productFiltersSchema.parse(input);
  const supabase = await createServerSupabaseClient();
  const from = (filters.page - 1) * filters.limit;
  const to = from + filters.limit - 1;
  let constrainedProductIds: Set<string> | undefined;

  // 1. Explicit collection table linkage if legacy collectionId provided
  if (filters.collectionId) {
    const { data, error } = await supabase
      .from("collection_products")
      .select("product_id")
      .eq("collection_id", filters.collectionId);
    if (error) throw new Error("Unable to filter the selected collection.", { cause: error });
    constrainedProductIds = new Set(data.map(({ product_id }) => product_id));
  }

  // 2. Price Range Filter
  if (filters.minimumPriceMinor !== undefined || filters.maximumPriceMinor !== undefined) {
    let priceQuery = supabase.from("product_variants").select("product_id").eq("status", "active").eq("is_available", true);
    if (filters.minimumPriceMinor !== undefined) priceQuery = priceQuery.gte("price_minor", filters.minimumPriceMinor);
    if (filters.maximumPriceMinor !== undefined) priceQuery = priceQuery.lte("price_minor", filters.maximumPriceMinor);
    const { data, error } = await priceQuery;
    if (error) throw new Error("Unable to apply the selected price range.", { cause: error });
    const priceIds = new Set(data.map(({ product_id }) => product_id));
    constrainedProductIds = constrainedProductIds
      ? new Set([...constrainedProductIds].filter((id) => priceIds.has(id)))
      : priceIds;
  }

  if (constrainedProductIds?.size === 0) {
    return { items: [], page: filters.page, pageSize: filters.limit, total: 0 };
  }

  // 3. Multi-field search across name, description, and brand name
  let brandIdsMatchingQuery: string[] = [];
  if (filters.query) {
    const { data: matchedBrands } = await supabase
      .from("brands")
      .select("id")
      .ilike("name", `%${filters.query}%`);
    if (matchedBrands && matchedBrands.length > 0) {
      brandIdsMatchingQuery = matchedBrands.map((b) => b.id);
    }
  }

  // Helper to execute product query with graceful column fallback for collection
  // Helper to execute product query with graceful column fallback for collection
  const buildProductQuery = (includeCollectionColumn: boolean, applyPagination: boolean = true) => {
    const selectCols = includeCollectionColumn
      ? "id, brand_id, name, slug, subtitle, description, concentration, collection"
      : "id, brand_id, name, slug, subtitle, description, concentration";

    let q = supabase
      .from("products")
      .select(selectCols, { count: "exact" })
      .eq("status", "active");

    if (filters.sort === "name_asc") {
      q = q.order("name", { ascending: true });
    } else {
      q = q.order("published_at", { ascending: false });
    }

    if (filters.brandId) q = q.eq("brand_id", filters.brandId);
    if (filters.familyId) q = q.eq("family_id", filters.familyId);
    if (filters.concentration) q = q.eq("concentration", filters.concentration);

    // Collection tier filter (Premium vs Regular)
    if (filters.collection && includeCollectionColumn) {
      q = q.eq("collection", filters.collection);
    }

    // Category / Gender filter
    if (filters.category === "men") {
      q = q.or("subtitle.ilike.%men%,subtitle.ilike.%homme%,description.ilike.%pour homme%");
    } else if (filters.category === "women") {
      q = q.or("subtitle.ilike.%women%,subtitle.ilike.%femme%,description.ilike.%pour femme%");
    } else if (filters.category === "unisex") {
      q = q.or("subtitle.ilike.%unisex%,description.ilike.%unisex%");
    }

    // Free text query across name, description, and matched brands
    if (filters.query) {
      const escaped = filters.query.replace(/[,()]/g, " ").trim();
      if (brandIdsMatchingQuery.length > 0) {
        q = q.or(
          `name.ilike.%${escaped}%,description.ilike.%${escaped}%,brand_id.in.(${brandIdsMatchingQuery.join(",")})`
        );
      } else {
        q = q.or(`name.ilike.%${escaped}%,description.ilike.%${escaped}%`);
      }
    }

    if (constrainedProductIds) {
      q = q.in("id", [...constrainedProductIds]);
    }

    return applyPagination ? q.range(from, to) : q;
  };

  // Attempt query with collection column first; fallback if migration is pending
  let products: Array<{
    id: string;
    brand_id: string;
    name: string;
    slug: string;
    subtitle: string | null;
    description: string;
    concentration: FragranceConcentration;
    collection?: string | null;
  }> = [];
  let count: number | null = 0;

  const firstAttempt = await buildProductQuery(true, true);
  if (firstAttempt.error) {
    const isColErr =
      firstAttempt.error.message?.includes("collection") ||
      firstAttempt.error.code === "PGRST204" ||
      firstAttempt.error.code === "42703";
    if (isColErr) {
      const applyRange = !filters.collection;
      const fallbackAttempt = await buildProductQuery(false, applyRange);
      if (fallbackAttempt.error) {
        throw new Error("Unable to load the fragrance catalogue.", { cause: fallbackAttempt.error });
      }
      let rawData = (fallbackAttempt.data as unknown as typeof products) ?? [];

      if (filters.collection) {
        rawData = rawData.filter(
          (p) => resolveProductCollection(p) === filters.collection
        );
        count = rawData.length;
        products = rawData.slice(from, to + 1);
      } else {
        products = rawData;
        count = fallbackAttempt.count;
      }
    } else {
      throw new Error("Unable to load the fragrance catalogue.", { cause: firstAttempt.error });
    }
  } else {
    products = (firstAttempt.data as unknown as typeof products) ?? [];
    count = firstAttempt.count;
  }

  const productIds = products.map((product) => product.id);
  if (productIds.length === 0) return { items: [], page: filters.page, pageSize: filters.limit, total: count ?? 0 };

  // Fetch variants, media, and brands in parallel
  const brandIds = Array.from(new Set(products.map((p) => p.brand_id)));
  let variantQuery = supabase
    .from("product_variants")
    .select("id, product_id, sku, label, size_ml, price_minor, currency")
    .in("product_id", productIds)
    .eq("status", "active")
    .eq("is_available", true)
    .order("size_ml");

  if (filters.minimumPriceMinor !== undefined) variantQuery = variantQuery.gte("price_minor", filters.minimumPriceMinor);
  if (filters.maximumPriceMinor !== undefined) variantQuery = variantQuery.lte("price_minor", filters.maximumPriceMinor);

  const [variantRes, mediaRes, brandsRes] = await Promise.all([
    variantQuery,
    supabase.from("product_media").select("product_id, storage_path, is_primary").in("product_id", productIds).order("sort_order"),
    supabase.from("brands").select("id, name").in("id", brandIds),
  ]);

  const { data: variants, error: variantError } = variantRes;
  if (variantError) throw new Error("Unable to load product variants.", { cause: variantError });

  const brandMap = new Map<string, string>((brandsRes.data ?? []).map((b) => [b.id, b.name]));

  const mediaByProduct = new Map<string, string>();
  for (const m of mediaRes.data ?? []) {
    if (m.is_primary || !mediaByProduct.has(m.product_id)) {
      mediaByProduct.set(m.product_id, m.storage_path);
    }
  }

  const variantsByProduct = new Map<string, ProductVariantSummary[]>();
  for (const variant of variants) {
    const current = variantsByProduct.get(variant.product_id) ?? [];
    current.push({
      id: variant.id,
      label: variant.label,
      price: { amountMinor: Number(variant.price_minor), currency: variant.currency },
      sizeMl: Number(variant.size_ml),
      sku: variant.sku,
    });
    variantsByProduct.set(variant.product_id, current);
  }

  const mappedItems = products
    .filter((product) => variantsByProduct.has(product.id))
    .map((product) => {
      const subLower = (product.subtitle || "").toLowerCase();
      let category: "unisex" | "men" | "women" = "unisex";
      if (subLower.includes("women") || subLower.includes("woman") || subLower.includes("pour femme") || subLower.includes("female")) {
        category = "women";
      } else if (subLower.includes("men") || subLower.includes("man") || subLower.includes("pour homme") || subLower.includes("male")) {
        category = "men";
      }

      const collectionTier = resolveProductCollection(product);

      return {
        brandId: product.brand_id,
        brandName: brandMap.get(product.brand_id) || "Solure Scents",
        concentration: product.concentration,
        id: product.id,
        name: product.name,
        slug: product.slug,
        subtitle: product.subtitle,
        category,
        collection: collectionTier,
        primaryImageUrl: mediaByProduct.get(product.id) ?? null,
        variants: variantsByProduct.get(product.id) ?? [],
      };
    });

  // Client-side / in-memory sorting for price options
  if (filters.sort === "price_asc") {
    mappedItems.sort((a, b) => {
      const minA = Math.min(...a.variants.map((v) => v.price.amountMinor));
      const minB = Math.min(...b.variants.map((v) => v.price.amountMinor));
      return minA - minB;
    });
  } else if (filters.sort === "price_desc") {
    mappedItems.sort((a, b) => {
      const minA = Math.min(...a.variants.map((v) => v.price.amountMinor));
      const minB = Math.min(...b.variants.map((v) => v.price.amountMinor));
      return minB - minA;
    });
  }

  return {
    items: mappedItems,
    page: filters.page,
    pageSize: filters.limit,
    total: count ?? mappedItems.length,
  };
}
