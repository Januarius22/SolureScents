import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProductSummary, ProductVariantSummary } from "@/features/catalog/types/catalog";
import { productFiltersSchema, type ProductFilters } from "@/features/catalog/validation/catalog";

export interface PaginatedProducts {
  items: ProductSummary[];
  page: number;
  pageSize: number;
  total: number;
}

/** Reads the public catalogue through RLS-filtered product and variant queries. */
export async function listPublishedProducts(input: ProductFilters): Promise<PaginatedProducts> {
  const filters = productFiltersSchema.parse(input);
  const supabase = await createServerSupabaseClient();
  const from = (filters.page - 1) * filters.limit;
  const to = from + filters.limit - 1;
  let constrainedProductIds: Set<string> | undefined;

  if (filters.collectionId) {
    const { data, error } = await supabase
      .from("collection_products")
      .select("product_id")
      .eq("collection_id", filters.collectionId);
    if (error) throw new Error("Unable to filter the selected collection.", { cause: error });
    constrainedProductIds = new Set(data.map(({ product_id }) => product_id));
  }

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

  let productQuery = supabase
    .from("products")
    .select("id, brand_id, name, slug, subtitle, concentration", { count: "exact" })
    .eq("status", "active")
    .order("published_at", { ascending: false })
    .range(from, to);

  if (filters.brandId) productQuery = productQuery.eq("brand_id", filters.brandId);
  if (filters.familyId) productQuery = productQuery.eq("family_id", filters.familyId);
  if (filters.concentration) productQuery = productQuery.eq("concentration", filters.concentration);
  if (filters.query) productQuery = productQuery.ilike("name", `%${filters.query}%`);
  if (constrainedProductIds) productQuery = productQuery.in("id", [...constrainedProductIds]);

  const { data: products, error: productError, count } = await productQuery;
  if (productError) throw new Error("Unable to load the fragrance catalogue.", { cause: productError });

  const productIds = products.map((product) => product.id);
  if (productIds.length === 0) return { items: [], page: filters.page, pageSize: filters.limit, total: count ?? 0 };

  let variantQuery = supabase
    .from("product_variants")
    .select("id, product_id, sku, label, size_ml, price_minor, currency")
    .in("product_id", productIds)
    .eq("status", "active")
    .eq("is_available", true)
    .order("size_ml");

  if (filters.minimumPriceMinor !== undefined) variantQuery = variantQuery.gte("price_minor", filters.minimumPriceMinor);
  if (filters.maximumPriceMinor !== undefined) variantQuery = variantQuery.lte("price_minor", filters.maximumPriceMinor);

  const { data: variants, error: variantError } = await variantQuery;
  if (variantError) throw new Error("Unable to load product variants.", { cause: variantError });

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

  return {
    items: products
      .filter((product) => variantsByProduct.has(product.id))
      .map((product) => ({
        brandId: product.brand_id,
        concentration: product.concentration,
        id: product.id,
        name: product.name,
        slug: product.slug,
        subtitle: product.subtitle,
        variants: variantsByProduct.get(product.id) ?? [],
      })),
    page: filters.page,
    pageSize: filters.limit,
    total: count ?? 0,
  };
}
