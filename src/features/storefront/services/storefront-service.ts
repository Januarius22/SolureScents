import { cache } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const getBrands = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("brands").select("id, name, slug, description, country_code").eq("is_active", true).order("sort_order").order("name");
  if (error) throw new Error("Unable to load fragrance houses.", { cause: error });
  return data;
});

export const getCollections = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("collections").select("id, name, slug, description, is_featured").eq("is_active", true).order("sort_order").order("name");
  if (error) throw new Error("Unable to load collections.", { cause: error });
  return data;
});

export const getProductBySlug = cache(async (slug: string) => {
  const supabase = await createServerSupabaseClient();
  const { data: product, error } = await supabase.from("products").select("id, brand_id, family_id, name, slug, subtitle, description, story, concentration, perfumer, launch_year, longevity_hours_min, longevity_hours_max, sillage, seo_title, seo_description").eq("slug", slug).eq("status", "active").maybeSingle();
  if (error) throw new Error("Unable to load this fragrance.", { cause: error });
  if (!product) return null;

  const [{ data: brand, error: brandError }, { data: variants, error: variantError }] = await Promise.all([
    supabase.from("brands").select("name, slug").eq("id", product.brand_id).single(),
    supabase.from("product_variants").select("id, label, size_ml, sku, price_minor, compare_at_price_minor, currency, weight_grams").eq("product_id", product.id).eq("status", "active").eq("is_available", true).order("size_ml"),
  ]);
  if (brandError || variantError) throw new Error("Unable to load complete fragrance details.", { cause: brandError ?? variantError });
  return { ...product, brand, variants };
});
