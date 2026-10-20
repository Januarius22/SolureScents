import { requireApplicationAccess } from "@/features/auth/services/authorization";
import { createServerSupabaseClient, createPrivilegedSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import {
  generateSku,
  generateSlug,
  type ProductAdminFormValues,
} from "@/features/admin/validation/product-admin";

export interface AdminProductDetail {
  id: string;
  name: string;
  slug: string;
  category?: "unisex" | "men" | "women";
  collection?: "premium" | "regular";
  subtitle: string | null;
  description: string;
  story: string | null;
  concentration: "edc" | "edt" | "edp" | "parfum" | "extrait" | "oil";
  perfumer: string | null;
  launch_year: number | null;
  longevity_hours_min: number | null;
  longevity_hours_max: number | null;
  sillage: "intimate" | "moderate" | "strong" | "enormous" | null;
  status: "draft" | "active" | "archived";
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  brand: {
    id: string;
    name: string;
    slug: string;
  };
  family?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  notes: {
    top: string[];
    heart: string[];
    base: string[];
  };
  media: {
    id: string;
    storage_path: string;
    alt_text: string;
    is_primary: boolean;
    sort_order: number;
    media_type: "image" | "video";
  }[];
  variants: {
    id: string;
    size_ml: number;
    label: string;
    sku: string;
    price_minor: number;
    compare_at_price_minor: number | null;
    cost_minor: number | null;
    currency: string;
    weight_grams: number;
    low_stock_limit: number;
    status: string;
    is_available: boolean;
    on_hand: number;
    reserved: number;
  }[];
}


/** Ensures an active brand exists or creates it idempotently */
async function resolveOrCreateBrand(
  db: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  brandName?: string | null,
  brandId?: string | null,
): Promise<string> {
  if (brandId) {
    const { data } = await db.from("brands").select("id").eq("id", brandId).maybeSingle();
    if (data?.id) return data.id;
  }

  const name = (brandName || "Solure Scents").trim();
  const slug = generateSlug(name) || "solure-scents";

  const { data: existing } = await db.from("brands").select("id").eq("name", name).maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await db
    .from("brands")
    .insert({
      name,
      slug,
      description: "Artisanal luxury perfumery house based in Nigeria.",
      country_code: "NG",
      is_active: true,
      sort_order: 0,
    })
    .select("id")
    .single();

  if (error || !created?.id) {
    // If conflict on slug or name, re-fetch
    const { data: fallback } = await db.from("brands").select("id").limit(1).single();
    if (fallback?.id) return fallback.id;
    throw new Error(`Unable to resolve or create brand '${name}': ${error?.message}`);
  }

  return created.id;
}

/** Ensures a fragrance family exists or creates it idempotently */
async function resolveOrCreateFamily(
  db: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  familyName?: string | null,
  familyId?: string | null,
): Promise<string | null> {
  if (familyId) return familyId;
  if (!familyName || !familyName.trim()) return null;

  const name = familyName.trim();
  const slug = generateSlug(name);

  const { data: existing } = await db.from("fragrance_families").select("id").eq("name", name).maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await db
    .from("fragrance_families")
    .insert({ name, slug, description: `${name} olfactory family.` })
    .select("id")
    .single();

  if (error || !created?.id) {
    const { data: fallback } = await db.from("fragrance_families").select("id").eq("name", name).maybeSingle();
    return fallback?.id ?? null;
  }

  return created.id;
}

/** Ensures at least one active inventory location exists */
async function resolveOrCreateDefaultLocation(
  db: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): Promise<string> {
  const { data: locations } = await db
    .from("inventory_locations")
    .select("id")
    .eq("is_active", true)
    .limit(1);

  if (locations && locations.length > 0 && locations[0]?.id) {
    return locations[0].id;
  }

  const { data: created, error } = await db
    .from("inventory_locations")
    .insert({
      name: "Solure Abuja Atelier",
      code: "ABJ-MAIN",
      address: {
        city: "Abuja",
        state: "Federal Capital Territory",
        country: "Nigeria",
      },
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !created?.id) {
    // Re-check in case another transaction created it
    const { data: retry } = await db.from("inventory_locations").select("id").limit(1).single();
    if (retry?.id) return retry.id;
    throw new Error(`Unable to initialize default inventory location: ${error?.message}`);
  }

  return created.id;
}

/** Syncs fragrance notes for a product */
async function syncProductNotes(
  db: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  productId: string,
  topNotesStr?: string | null,
  heartNotesStr?: string | null,
  baseNotesStr?: string | null,
) {
  // Clear previous product notes
  await db.from("product_notes").delete().eq("product_id", productId);

  const positions: Array<{ pos: "top" | "heart" | "base"; raw?: string | null }> = [
    { pos: "top", raw: topNotesStr },
    { pos: "heart", raw: heartNotesStr },
    { pos: "base", raw: baseNotesStr },
  ];

  for (const { pos, raw } of positions) {
    if (!raw || !raw.trim()) continue;
    const noteNames = raw
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2);

    for (const name of noteNames) {
      const slug = generateSlug(name);
      if (!slug) continue;

      let noteId: string | null = null;
      const { data: existing } = await db.from("fragrance_notes").select("id").eq("name", name).maybeSingle();
      if (existing?.id) {
        noteId = existing.id;
      } else {
        const { data: created } = await db
          .from("fragrance_notes")
          .insert({ name, slug, description: `${name} note.` })
          .select("id")
          .maybeSingle();
        noteId = created?.id ?? null;
      }

      if (noteId) {
        await db.from("product_notes").insert({
          product_id: productId,
          note_id: noteId,
          position: pos,
          prominence: 3,
        });
      }
    }
  }
}

/** Loads catalogue facets (brands, families, locations) for dropdowns */
export async function getAdminCatalogueFacets() {
  await requireApplicationAccess("admin");
  const db = await createServerSupabaseClient();

  const [brandsRes, familiesRes, locationsRes] = await Promise.all([
    db.from("brands").select("id, name, slug").order("name"),
    db.from("fragrance_families").select("id, name, slug").order("name"),
    db.from("inventory_locations").select("id, name, code").eq("is_active", true).order("name"),
  ]);

  return {
    brands: brandsRes.data ?? [],
    families: familiesRes.data ?? [],
    locations: locationsRes.data ?? [],
  };
}

/** Loads full product details including variants, notes, media, and inventory */
export async function getAdminProductForEdit(id: string): Promise<AdminProductDetail | null> {
  await requireApplicationAccess("admin");
  const db = await createServerSupabaseClient();

  const { data: product, error: productError } = await db
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (productError || !product) {
    return null;
  }

  const [brandRes, familyRes, variantsRes, levelsRes, mediaRes, productNotesRes] = await Promise.all([
    db.from("brands").select("id, name, slug").eq("id", product.brand_id).single(),
    product.family_id
      ? db.from("fragrance_families").select("id, name, slug").eq("id", product.family_id).maybeSingle()
      : Promise.resolve({ data: null }),
    db.from("product_variants").select("*").eq("product_id", product.id).order("size_ml"),
    db.from("inventory_levels").select("variant_id, on_hand, reserved"),
    db.from("product_media").select("*").eq("product_id", product.id).order("sort_order"),
    db.from("product_notes").select("position, fragrance_notes(name)").eq("product_id", product.id),
  ]);

  const stockByVariant = new Map<string, { on_hand: number; reserved: number }>();
  for (const l of levelsRes.data ?? []) {
    const prev = stockByVariant.get(l.variant_id) ?? { on_hand: 0, reserved: 0 };
    stockByVariant.set(l.variant_id, {
      on_hand: prev.on_hand + l.on_hand,
      reserved: prev.reserved + l.reserved,
    });
  }

  const topNotes: string[] = [];
  const heartNotes: string[] = [];
  const baseNotes: string[] = [];

  for (const pn of productNotesRes.data ?? []) {
    const noteName = (pn.fragrance_notes as unknown as { name?: string })?.name;
    if (!noteName) continue;
    if (pn.position === "top") topNotes.push(noteName);
    if (pn.position === "heart") heartNotes.push(noteName);
    if (pn.position === "base") baseNotes.push(noteName);
  }

  const variants = (variantsRes.data ?? []).map((v) => {
    const stock = stockByVariant.get(v.id) ?? { on_hand: 0, reserved: 0 };
    return {
      id: v.id,
      size_ml: Number(v.size_ml),
      label: v.label,
      sku: v.sku,
      price_minor: Number(v.price_minor),
      compare_at_price_minor: v.compare_at_price_minor ? Number(v.compare_at_price_minor) : null,
      cost_minor: v.cost_minor ? Number(v.cost_minor) : null,
      currency: v.currency,
      weight_grams: v.weight_grams,
      low_stock_limit: v.low_stock_limit,
      status: v.status,
      is_available: v.is_available,
      on_hand: stock.on_hand,
      reserved: stock.reserved,
    };
  });

  let category: "unisex" | "men" | "women" = "unisex";
  const subLower = (product.subtitle || "").toLowerCase();
  if (subLower.includes("women") || subLower.includes("woman") || subLower.includes("female") || subLower.includes("pour femme")) {
    category = "women";
  } else if (subLower.includes("men") || subLower.includes("man") || subLower.includes("male") || subLower.includes("pour homme")) {
    category = "men";
  }

  const collection: "premium" | "regular" =
    (product as Record<string, unknown>).collection === "premium" ? "premium" : "regular";

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category,
    collection,
    subtitle: product.subtitle,
    description: product.description,
    story: product.story,
    concentration: product.concentration,
    perfumer: product.perfumer,
    launch_year: product.launch_year,
    longevity_hours_min: product.longevity_hours_min ? Number(product.longevity_hours_min) : null,
    longevity_hours_max: product.longevity_hours_max ? Number(product.longevity_hours_max) : null,
    sillage: product.sillage,
    status: product.status,
    is_featured: product.is_featured,
    seo_title: product.seo_title,
    seo_description: product.seo_description,
    published_at: product.published_at,
    created_at: product.created_at,
    updated_at: product.updated_at,
    brand: brandRes.data ?? { id: product.brand_id, name: "Solure Scents", slug: "solure-scents" },
    family: familyRes.data ?? null,
    notes: {
      top: topNotes,
      heart: heartNotes,
      base: baseNotes,
    },
    media: (mediaRes.data ?? []).map((m) => ({
      id: m.id,
      storage_path: m.storage_path,
      alt_text: m.alt_text,
      is_primary: m.is_primary,
      sort_order: m.sort_order,
      media_type: m.media_type,
    })),
    variants,
  };
}

/** Creates a perfume, variants, media, notes, and records initial inventory */
export async function createAdminProduct(input: ProductAdminFormValues): Promise<string> {
  const admin = await requireApplicationAccess("admin");
  const db = createPrivilegedSupabaseClient() ?? (await createServerSupabaseClient());

  const brandId = await resolveOrCreateBrand(db, input.brand_name, input.brand_id);
  const familyId = input.family_name || input.family_id ? await resolveOrCreateFamily(db, input.family_name, input.family_id) : null;
  const locationId = await resolveOrCreateDefaultLocation(db);

  const publishedAt = input.status === "active" ? new Date().toISOString() : null;
  const slug = input.slug?.trim() || generateSlug(input.name);

  let subtitle = input.subtitle?.trim() || null;
  if (!subtitle && input.category) {
    subtitle = input.category === "men" ? "Fragrance for Men" : input.category === "women" ? "Fragrance for Women" : "Unisex Fragrance";
  }

  const concentration = input.concentration || "edp";
  const collectionTier: "premium" | "regular" = input.collection || "regular";

  // 1. Insert product record (resilient to pending database migration)
  const insertPayload: Database["public"]["Tables"]["products"]["Insert"] = {
    brand_id: brandId,
    family_id: familyId,
    name: input.name.trim(),
    slug: slug,
    subtitle: subtitle,
    description: input.description.trim(),
    story: input.story?.trim() || null,
    concentration: concentration,
    perfumer: input.perfumer?.trim() || null,
    launch_year: input.launch_year || null,
    longevity_hours_min: input.longevity_hours_min ?? null,
    longevity_hours_max: input.longevity_hours_max ?? null,
    sillage: input.sillage || null,
    status: input.status,
    is_featured: input.is_featured,
    seo_title: input.seo_title?.trim() || null,
    seo_description: input.seo_description?.trim() || null,
    published_at: publishedAt,
    collection: collectionTier,
  };

  let productResult = await db.from("products").insert(insertPayload).select("id").single();
  if (
    productResult.error &&
    (productResult.error.message?.includes("collection") ||
      productResult.error.code === "PGRST204" ||
      productResult.error.code === "42703")
  ) {
    delete insertPayload.collection;
    productResult = await db.from("products").insert(insertPayload).select("id").single();
  }

  const product = productResult.data;
  const productError = productResult.error;

  if (productError || !product?.id) {
    throw new Error(`Failed to create perfume record: ${productError?.message}`);
  }

  const productId = product.id;

  // 2. Insert Media records
  if (input.media && input.media.length > 0) {
    const hasPrimary = input.media.some((m) => m.is_primary);
    const mediaToInsert = input.media.map((m, idx) => ({
      product_id: productId,
      storage_path: m.storage_path,
      alt_text: m.alt_text || `${input.name} photograph`,
      is_primary: hasPrimary ? m.is_primary : idx === 0,
      sort_order: m.sort_order ?? idx,
      media_type: m.media_type || "image",
    }));

    const { error: mediaError } = await db.from("product_media").insert(mediaToInsert);
    if (mediaError) {
      console.error("Warning: Error inserting product media:", mediaError);
    }
  }

  // 3. Insert Notes only if provided
  if (input.top_notes || input.heart_notes || input.base_notes) {
    await syncProductNotes(db, productId, input.top_notes, input.heart_notes, input.base_notes);
  }

  // 4. Insert Variants and Initialize Inventory
  for (const variant of input.variants) {
    const sizeMl = Number(variant.size_ml);
    const label = variant.label?.trim() || `${sizeMl}ml Bottle`;
    const sku = variant.sku?.trim()?.toUpperCase() || generateSku(input.name, sizeMl);
    const priceMinor = Math.round(variant.price_naira * 100);
    const compareAtPriceMinor =
      variant.compare_at_price_naira && variant.compare_at_price_naira > variant.price_naira
        ? Math.round(variant.compare_at_price_naira * 100)
        : null;
    const costMinor = variant.cost_naira ? Math.round(variant.cost_naira * 100) : null;
    const weightGrams = variant.weight_grams || Math.max(100, Math.round(sizeMl * 4));
    const lowStockLimit = variant.low_stock_limit ?? 5;
    const isAvailable = variant.is_available ?? true;
    const variantStatus = input.status === "active" ? "active" : "draft";

    const { data: createdVariant, error: variantError } = await db
      .from("product_variants")
      .insert({
        product_id: productId,
        size_ml: sizeMl,
        label: label,
        sku: sku,
        price_minor: priceMinor,
        compare_at_price_minor: compareAtPriceMinor,
        cost_minor: costMinor,
        currency: "NGN",
        weight_grams: weightGrams,
        low_stock_limit: lowStockLimit,
        status: variantStatus,
        is_available: isAvailable,
      })
      .select("id")
      .single();

    if (variantError || !createdVariant?.id) {
      throw new Error(`Failed to create variant ${sku}: ${variantError?.message}`);
    }

    // Ensure inventory level exists for variant and location (idempotent, prevents duplicate error on retry)
    const { data: existingLevel } = await db
      .from("inventory_levels")
      .select("id, on_hand, reserved")
      .eq("variant_id", createdVariant.id)
      .eq("location_id", locationId)
      .maybeSingle();

    let levelId = existingLevel?.id;
    const initialStock = Number(variant.initial_stock) || 0;

    if (!levelId) {
      const { data: level, error: levelError } = await db
        .from("inventory_levels")
        .insert({
          variant_id: createdVariant.id,
          location_id: locationId,
          on_hand: initialStock,
          reserved: 0,
        })
        .select("id")
        .single();

      if (levelError || !level?.id) {
        throw new Error(`Failed to initialize inventory level for variant: ${levelError?.message}`);
      }
      levelId = level.id;

      // If initial stock is specified, audit-record movement
      if (initialStock > 0) {
        const { error: moveError } = await db.from("inventory_movements").insert({
          inventory_level_id: levelId,
          reason: "receipt",
          quantity_delta: initialStock,
          reference_type: "initial_setup",
          reference_id: createdVariant.id,
          note: `Initial stock intake for ${sku} (${admin.email})`,
        });
        if (moveError) {
          console.error("Warning: Error recording initial stock movement:", moveError);
        }
      }
    }
  }

  return productId;
}

/** Updates a perfume, variants, media, and inventory */
export async function updateAdminProduct(id: string, input: ProductAdminFormValues): Promise<void> {
  const admin = await requireApplicationAccess("admin");
  const db = createPrivilegedSupabaseClient() ?? (await createServerSupabaseClient());

  // Load full existing product to preserve fields not in the simplified form
  const { data: existing, error: findError } = await db
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (findError || !existing) {
    throw new Error(`Product not found with id ${id}`);
  }

  const brandId = await resolveOrCreateBrand(db, input.brand_name, input.brand_id);
  const familyId = input.family_name || input.family_id ? await resolveOrCreateFamily(db, input.family_name, input.family_id) : existing.family_id;
  const locationId = await resolveOrCreateDefaultLocation(db);

  let publishedAt = existing.published_at;
  if (input.status === "active" && !publishedAt) {
    publishedAt = new Date().toISOString();
  } else if (input.status !== "active") {
    publishedAt = null;
  }

  let subtitle = input.subtitle !== undefined ? (input.subtitle?.trim() || null) : existing.subtitle;
  if (!subtitle && input.category) {
    subtitle = input.category === "men" ? "Fragrance for Men" : input.category === "women" ? "Fragrance for Women" : "Unisex Fragrance";
  }

  // 1. Update product base fields with preservation of existing advanced fields
  const updatePayload: Database["public"]["Tables"]["products"]["Update"] = {
    brand_id: brandId,
    family_id: familyId,
    name: input.name.trim(),
    slug: input.slug?.trim() || existing.slug || generateSlug(input.name),
    subtitle,
    description: input.description.trim(),
    story: input.story !== undefined ? (input.story?.trim() || null) : existing.story,
    concentration: input.concentration || existing.concentration || "edp",
    perfumer: input.perfumer !== undefined ? (input.perfumer?.trim() || null) : existing.perfumer,
    launch_year: input.launch_year !== undefined ? input.launch_year : existing.launch_year,
    longevity_hours_min: input.longevity_hours_min !== undefined ? input.longevity_hours_min : existing.longevity_hours_min,
    longevity_hours_max: input.longevity_hours_max !== undefined ? input.longevity_hours_max : existing.longevity_hours_max,
    sillage: input.sillage !== undefined ? input.sillage : existing.sillage,
    status: input.status,
    is_featured: input.is_featured ?? existing.is_featured,
    seo_title: input.seo_title !== undefined ? (input.seo_title?.trim() || null) : existing.seo_title,
    seo_description: input.seo_description !== undefined ? (input.seo_description?.trim() || null) : existing.seo_description,
    published_at: publishedAt,
    collection:
      input.collection ||
      ((existing as Record<string, unknown>).collection as "premium" | "regular") ||
      "regular",
  };

  let { error: updateError } = await db.from("products").update(updatePayload).eq("id", id);
  if (
    updateError &&
    (updateError.message?.includes("collection") ||
      updateError.code === "PGRST204" ||
      updateError.code === "42703")
  ) {
    delete updatePayload.collection;
    const retryRes = await db.from("products").update(updatePayload).eq("id", id);
    updateError = retryRes.error;
  }

  if (updateError) {
    throw new Error(`Failed to update product details: ${updateError.message}`);
  }

  // 2. Sync Media if provided
  if (input.media !== undefined) {
    await db.from("product_media").delete().eq("product_id", id);
    if (input.media && input.media.length > 0) {
      const hasPrimary = input.media.some((m) => m.is_primary);
      const mediaToInsert = input.media.map((m, idx) => ({
        product_id: id,
        storage_path: m.storage_path,
        alt_text: m.alt_text || `${input.name} photograph`,
        is_primary: hasPrimary ? m.is_primary : idx === 0,
        sort_order: m.sort_order ?? idx,
        media_type: m.media_type || "image",
      }));

      await db.from("product_media").insert(mediaToInsert);
    }
  }

  // 3. Sync Notes only if provided
  if (input.top_notes !== undefined || input.heart_notes !== undefined || input.base_notes !== undefined) {
    await syncProductNotes(db, id, input.top_notes, input.heart_notes, input.base_notes);
  }

  // 4. Sync Variants & Stock
  const { data: currentVariants } = await db
    .from("product_variants")
    .select("id, sku")
    .eq("product_id", id);

  const existingVariantMap = new Map((currentVariants ?? []).map((v) => [v.id, v]));

  for (const variant of input.variants) {
    const sizeMl = Number(variant.size_ml);
    const label = variant.label?.trim() || `${sizeMl}ml Bottle`;
    const sku = variant.sku?.trim()?.toUpperCase() || generateSku(input.name, sizeMl);
    const priceMinor = Math.round(variant.price_naira * 100);
    const compareAtPriceMinor =
      variant.compare_at_price_naira && variant.compare_at_price_naira > variant.price_naira
        ? Math.round(variant.compare_at_price_naira * 100)
        : null;
    const costMinor = variant.cost_naira ? Math.round(variant.cost_naira * 100) : null;
    const weightGrams = variant.weight_grams || Math.max(100, Math.round(sizeMl * 4));
    const variantStatus = input.status === "active" ? "active" : "draft";
    const lowStockLimit = variant.low_stock_limit ?? 5;
    const isAvailable = variant.is_available ?? true;

    let variantId = variant.id;

    if (variantId && existingVariantMap.has(variantId)) {
      // Update existing variant
      await db
        .from("product_variants")
        .update({
          size_ml: sizeMl,
          label: label,
          sku: sku,
          price_minor: priceMinor,
          compare_at_price_minor: compareAtPriceMinor,
          cost_minor: costMinor,
          weight_grams: weightGrams,
          low_stock_limit: lowStockLimit,
          status: variantStatus,
          is_available: isAvailable,
        })
        .eq("id", variantId);
    } else {
      // Insert new variant
      const { data: created, error: createVarError } = await db
        .from("product_variants")
        .insert({
          product_id: id,
          size_ml: sizeMl,
          label: label,
          sku: sku,
          price_minor: priceMinor,
          compare_at_price_minor: compareAtPriceMinor,
          cost_minor: costMinor,
          currency: "NGN",
          weight_grams: weightGrams,
          low_stock_limit: lowStockLimit,
          status: variantStatus,
          is_available: isAvailable,
        })
        .select("id")
        .single();

      if (createVarError || !created?.id) {
        throw new Error(`Failed to add variant ${sku}: ${createVarError?.message}`);
      }
      variantId = created.id;
    }

    // Ensure inventory level exists atomically and safely
    const targetStock = variant.initial_stock !== undefined ? Number(variant.initial_stock) : undefined;

    // 1. Prefer atomic database RPC if deployed
    let rpcHandled = false;
    if (targetStock !== undefined) {
      const { error: rpcError } = await db.rpc("set_variant_inventory_stock", {
        p_variant_id: variantId,
        p_location_id: locationId,
        p_target_on_hand: targetStock,
        p_reason: "correction",
        p_note: `Product edit stock adjustment for ${sku} (${admin.email})`,
      });

      if (!rpcError) {
        rpcHandled = true;
      }
    }

    if (!rpcHandled) {
      // 2. Resilient application-level fallback with strict invariant checks
      const { data: existingLevel } = await db
        .from("inventory_levels")
        .select("id, on_hand, reserved")
        .eq("variant_id", variantId)
        .eq("location_id", locationId)
        .maybeSingle();

      let levelId = existingLevel?.id;
      const currentOnHand = existingLevel?.on_hand ?? 0;
      const currentReserved = existingLevel?.reserved ?? 0;
      const resolvedTarget = targetStock !== undefined ? targetStock : currentOnHand;

      if (!levelId) {
        const { data: createdLevel, error: createLevelErr } = await db
          .from("inventory_levels")
          .insert({
            variant_id: variantId,
            location_id: locationId,
            on_hand: resolvedTarget,
            reserved: 0,
          })
          .select("id")
          .single();

        if (createLevelErr || !createdLevel?.id) {
          throw new Error(`Failed to initialize inventory level for variant: ${createLevelErr?.message}`);
        }
        levelId = createdLevel.id;

        if (resolvedTarget > 0) {
          await db.from("inventory_movements").insert({
            inventory_level_id: levelId,
            reason: "receipt",
            quantity_delta: resolvedTarget,
            reference_type: "initial_setup",
            reference_id: variantId,
            note: `Initial stock intake for ${sku} (${admin.email})`,
          });
        }
      } else if (targetStock !== undefined && targetStock !== currentOnHand) {
        // Enforce inventory invariant: cannot reduce below active reservations
        if (targetStock < currentReserved) {
          throw new Error(
            `Cannot reduce stock of ${sku} to ${targetStock}. It has ${currentReserved} units actively reserved in checkout.`
          );
        }

        const delta = targetStock - currentOnHand;
        if (delta !== 0) {
          const reason = delta > 0 ? "receipt" : "correction";
          await db
            .from("inventory_levels")
            .update({
              on_hand: targetStock,
              updated_at: new Date().toISOString(),
            })
            .eq("id", levelId);

          await db.from("inventory_movements").insert({
            inventory_level_id: levelId,
            reason,
            quantity_delta: delta,
            reference_type: "manual_adjustment",
            reference_id: variantId,
            note: `Admin inventory update for ${sku} (${admin.email})`,
          });
        }
      }
    }
  }
}

/** Toggles product status between draft, active, and archived */
export async function toggleProductStatus(
  id: string,
  newStatus: "draft" | "active" | "archived",
): Promise<void> {
  await requireApplicationAccess("admin");
  const db = await createServerSupabaseClient();

  if (newStatus === "active") {
    // Validate that at least one variant exists and has a positive price
    const { data: variants, error: varError } = await db
      .from("product_variants")
      .select("id, price_minor, is_available")
      .eq("product_id", id);

    if (varError || !variants || variants.length === 0) {
      throw new Error("Cannot publish perfume: At least one bottle size variant is required.");
    }

    const hasValidVariant = variants.some((v) => v.is_available && v.price_minor > 0);
    if (!hasValidVariant) {
      throw new Error("Cannot publish perfume: At least one variant must be marked available with a valid price.");
    }
  }

  const publishedAt = newStatus === "active" ? new Date().toISOString() : null;

  const { error } = await db
    .from("products")
    .update({
      status: newStatus,
      published_at: publishedAt,
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to change product status to ${newStatus}: ${error.message}`);
  }

  // Also update variant statuses
  const variantStatus = newStatus === "active" ? "active" : newStatus === "archived" ? "discontinued" : "draft";
  await db.from("product_variants").update({ status: variantStatus }).eq("product_id", id);
}

/** Soft-archives a product without deleting order history */
export async function archiveProduct(id: string): Promise<void> {
  await toggleProductStatus(id, "archived");
}
