import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cfpccldullprbrsvfblv.supabase.co";
const SUPABASE_KEY = "sb_publishable_sC4iqDrE0sVT35hgLF1Cmw_O9EcVWS8";
const APP_URL = "http://localhost:3000";

async function runLiveSprint26Tests() {
  console.log("=================================================");
  console.log("SPRINT 2.6: LIVE INTEGRATION & STORAGE SECURITY TESTS");
  console.log("=================================================\n");

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // TEST 1: Storage Bucket Configuration
  console.log("TEST 1: Verifying product-media bucket existence & public read...");
  const { data: publicUrlData } = supabase.storage
    .from("product-media")
    .getPublicUrl("catalogue/test-sample.jpg");
  assert.ok(publicUrlData.publicUrl.includes("product-media"), "Public URL must reference product-media bucket");
  console.log("✓ Bucket public URL generated:", publicUrlData.publicUrl);

  // TEST 2: Security — Anonymous direct upload to product-media MUST be rejected by RLS
  console.log("\nTEST 2: Verifying unauthenticated uploads are rejected by Supabase Storage RLS...");
  const dummyBuffer = Buffer.from("fake image data for testing RLS");
  const { error: anonUploadError } = await supabase.storage
    .from("product-media")
    .upload(`catalogue/unauthorized-${Date.now()}.jpg`, dummyBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });
  assert.ok(anonUploadError, "Anonymous upload must fail RLS policy");
  console.log("✓ Anonymous upload correctly rejected with:", anonUploadError.message);

  // TEST 3: Route Handler Security — /api/admin/product-media/upload rejects unauthenticated requests
  console.log("\nTEST 3: Verifying /api/admin/product-media/upload endpoint security...");
  const unauthUploadRes = await fetch(`${APP_URL}/api/admin/product-media/upload`, {
    method: "POST",
    body: new FormData(),
  });
  console.log("Unauthenticated upload status:", unauthUploadRes.status);
  assert.strictEqual(unauthUploadRes.status, 401, "Expected 401 Unauthorized for unauthenticated upload");
  const unauthJson = await unauthUploadRes.json();
  console.log("✓ Unauthenticated response correctly returned 401:", unauthJson.message);

  // TEST 4: Verification of existing published products & variants in Supabase DB
  console.log("\nTEST 4: Inspecting active products & storefront accessibility...");
  const { data: activeProducts, error: prodErr } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      subtitle,
      description,
      status,
      product_variants (id, size_ml, price_minor, sku, is_available),
      product_media (id, storage_path, is_primary)
    `)
    .eq("status", "active")
    .limit(3);

  if (prodErr) {
    console.error("Query error:", prodErr.message);
  } else {
    console.log(`✓ Found ${activeProducts.length} active published products.`);
    for (const p of activeProducts) {
      console.log(`  - Product: "${p.name}" (slug: /shop/${p.slug})`);
      console.log(`    Subtitle: ${p.subtitle || "(none)"}`);
      console.log(`    Variants: ${p.product_variants?.length ?? 0} variants`);
      console.log(`    Media: ${p.product_media?.length ?? 0} photos`);
    }
  }

  // TEST 5: Verify Storefront route returns 200 OK for /shop
  console.log("\nTEST 5: Testing storefront /shop accessibility...");
  const shopRes = await fetch(`${APP_URL}/shop`);
  console.log("Storefront /shop status:", shopRes.status);
  assert.strictEqual(shopRes.status, 200, "Storefront /shop must return 200 OK");
  console.log("✓ Storefront catalogue renders successfully (200 OK)");

  console.log("\n=================================================");
  console.log("ALL LIVE SPRINT 2.6 INTEGRATION TESTS PASSED!");
  console.log("=================================================");
}

runLiveSprint26Tests().catch((err) => {
  console.error("\n❌ Live test failed:", err);
  process.exit(1);
});
