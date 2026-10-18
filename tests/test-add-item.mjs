import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cfpccldullprbrsvfblv.supabase.co";
const SUPABASE_KEY = "sb_publishable_sC4iqDrE0sVT35hgLF1Cmw_O9EcVWS8";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testFetchVariant() {
  const variantId = "0c48e830-3ba9-4699-b794-9afb777cb0f5"; // Khalifa Scent 50ml
  console.log("Testing fetchTrustedVariant for variantId:", variantId);

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select(`
      id,
      product_id,
      label,
      size_ml,
      sku,
      price_minor,
      compare_at_price_minor,
      currency,
      status,
      is_available,
      products (
        id,
        name,
        slug,
        subtitle,
        concentration,
        status,
        brand_id
      )
    `)
    .eq("id", variantId)
    .single();

  console.log("variant result:", {
    variant,
    error: variantError ? { code: variantError.code, message: variantError.message } : null,
  });

  if (variant) {
    const product = variant.products;
    console.log("Product:", product);
    console.log("Condition check:", {
      hasProduct: Boolean(product),
      productStatus: product?.status,
      variantStatus: variant?.status,
      is_available: variant?.is_available,
      passes: Boolean(product && product.status === "active" && variant.status === "active" && variant.is_available)
    });
  }
}

testFetchVariant().catch(console.error);
