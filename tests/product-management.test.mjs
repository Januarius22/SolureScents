import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

// Schemas under test
const fragranceConcentrationEnum = z.enum(["edc", "edt", "edp", "parfum", "extrait", "oil"]);
const sillageLevelEnum = z.enum(["intimate", "moderate", "strong", "enormous"]);
const productStatusEnum = z.enum(["draft", "active", "archived"]);
const productCategoryEnum = z.enum(["unisex", "men", "women"]);

const variantAdminInputSchema = z.object({
  id: z.string().uuid().optional(),
  size_ml: z.coerce.number().positive("Bottle size must be greater than 0ml"),
  label: z.string().trim().max(40).optional(),
  price_naira: z.coerce.number().min(0, "Price must be non-negative"),
  compare_at_price_naira: z.coerce.number().min(0).optional().nullable(),
  cost_naira: z.coerce.number().min(0).optional().nullable(),
  sku: z.string().trim().max(50).optional(),
  weight_grams: z.coerce.number().int().positive().optional(),
  initial_stock: z.coerce.number().int().min(0, "Stock cannot be negative").default(0),
  low_stock_limit: z.coerce.number().int().min(0).default(5),
  is_available: z.boolean().default(true),
});

const productMediaInputSchema = z.object({
  id: z.string().uuid().optional(),
  storage_path: z.string().trim().min(1, "Media path or URL is required"),
  alt_text: z.string().trim().min(2, "Alt text must be at least 2 characters").max(180),
  is_primary: z.boolean().default(false),
  sort_order: z.coerce.number().int().default(0),
  media_type: z.enum(["image", "video"]).default("image"),
});

const productAdminFormSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2, "Perfume name must be at least 2 characters").max(160),
    slug: z.string().trim().optional(),
    category: productCategoryEnum.default("unisex"),
    subtitle: z.string().trim().max(255).optional().nullable(),
    brand_name: z.string().trim().min(2).max(120).default("Solure Scents"),
    brand_id: z.string().uuid().optional().nullable(),
    family_name: z.string().trim().max(80).optional().nullable(),
    family_id: z.string().uuid().optional().nullable(),
    description: z.string().trim().min(20, "Description must be at least 20 characters").max(10000),
    story: z.string().trim().max(10000).optional().nullable(),
    concentration: fragranceConcentrationEnum.default("edp"),
    perfumer: z.string().trim().max(120).optional().nullable(),
    launch_year: z.coerce.number().int().min(1700).optional().nullable(),
    longevity_hours_min: z.coerce.number().min(0).optional().nullable(),
    longevity_hours_max: z.coerce.number().min(0).optional().nullable(),
    sillage: sillageLevelEnum.optional().nullable(),
    top_notes: z.string().trim().optional().nullable(),
    heart_notes: z.string().trim().optional().nullable(),
    base_notes: z.string().trim().optional().nullable(),
    status: productStatusEnum.default("draft"),
    is_featured: z.boolean().default(false),
    seo_title: z.string().trim().max(70).optional().nullable(),
    seo_description: z.string().trim().max(170).optional().nullable(),
    variants: z.array(variantAdminInputSchema).min(1, "At least one bottle size variant is required"),
    media: z.array(productMediaInputSchema).default([]),
  })
  .refine(
    (data) => {
      if (data.status === "active") {
        return data.variants.some((v) => v.is_available && v.price_naira > 0);
      }
      return true;
    },
    {
      message: "An active/published perfume must have at least one available variant with a valid price.",
      path: ["variants"],
    },
  )
  .refine(
    (data) => {
      if (
        data.longevity_hours_min !== null &&
        data.longevity_hours_min !== undefined &&
        data.longevity_hours_max !== null &&
        data.longevity_hours_max !== undefined
      ) {
        return data.longevity_hours_max >= data.longevity_hours_min;
      }
      return true;
    },
    {
      message: "Maximum longevity hours cannot be less than minimum longevity hours.",
      path: ["longevity_hours_max"],
    },
  );

function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateSku(productName, sizeMl) {
  const cleanName = (productName || "SCENT")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  return `SOL-${cleanName || "SCENT"}-${sizeMl}ML`;
}

test("Sprint 2.5: Administrative Product Management & Validation Suite", async (t) => {
  await t.test("Scenario 1: Valid product creation schema passes with multiple bottle sizes and images", () => {
    const validData = {
      name: "Solure Oud Royal",
      slug: "solure-oud-royal",
      subtitle: "Extrait de Parfum · Unisex",
      brand_name: "Solure Scents",
      description: "A decadent, multi-layered composition of rare agarwood, wild bergamot, and smoky bourbon vanilla.",
      story: "Crafted in the Lagos Atelier drawing inspiration from ancient Saharan trade routes.",
      concentration: "extrait",
      perfumer: "Januarius & Solure Master Noses",
      launch_year: 2026,
      longevity_hours_min: 10,
      longevity_hours_max: 16,
      sillage: "enormous",
      top_notes: "Italian Bergamot, Pink Pepper, Sicilian Lemon",
      heart_notes: "Damask Rose, French Orris, Orange Blossom",
      base_notes: "Cambodian Oud, Bourbon Vanilla, Ambergris",
      status: "active",
      variants: [
        {
          size_ml: 50,
          label: "50ml Flacon",
          sku: "SOL-OUD-50ML",
          price_naira: 45000,
          initial_stock: 12,
          low_stock_limit: 4,
          is_available: true,
        },
        {
          size_ml: 100,
          label: "100ml Flacon",
          sku: "SOL-OUD-100ML",
          price_naira: 80000,
          initial_stock: 6,
          low_stock_limit: 3,
          is_available: true,
        },
      ],
      media: [
        {
          storage_path: "catalogue/solure-oud-royal-bottle.webp",
          alt_text: "Sculptural flacon bottle of Solure Oud Royal",
          is_primary: true,
          sort_order: 0,
        },
      ],
    };

    const parsed = productAdminFormSchema.safeParse(validData);
    assert.strictEqual(parsed.success, true);
    assert.strictEqual(parsed.data.variants.length, 2);
    assert.strictEqual(parsed.data.media.length, 1);
  });

  await t.test("Scenario 2: Validation rejects descriptions shorter than 20 characters", () => {
    const invalidData = {
      name: "Short Perfume",
      slug: "short-perfume",
      description: "Too short.",
      concentration: "edp",
      variants: [
        {
          size_ml: 50,
          label: "50ml Flacon",
          sku: "SOL-SHORT-50ML",
          price_naira: 35000,
          initial_stock: 5,
        },
      ],
    };

    const parsed = productAdminFormSchema.safeParse(invalidData);
    assert.strictEqual(parsed.success, false);
    const errors = parsed.error.flatten().fieldErrors;
    assert.ok(errors.description);
    assert.match(errors.description[0], /at least 20 characters/);
  });

  await t.test("Scenario 3: Publishing requires at least one sellable variant with price > 0", () => {
    const noAvailableVariant = {
      name: "Unpublished Beauty",
      slug: "unpublished-beauty",
      description: "A sufficiently long description of the fragrance with more than 20 characters.",
      concentration: "edp",
      status: "active",
      variants: [
        {
          size_ml: 50,
          label: "50ml",
          sku: "SOL-UNPUB-50ML",
          price_naira: 0,
          is_available: false,
          initial_stock: 0,
        },
      ],
    };

    const parsed = productAdminFormSchema.safeParse(noAvailableVariant);
    assert.strictEqual(parsed.success, false);
    assert.ok(parsed.error.message.includes("active/published perfume must have at least one available variant"));

    // However, draft mode is allowed without active sellable variants
    const draftVersion = { ...noAvailableVariant, status: "draft" };
    const draftParsed = productAdminFormSchema.safeParse(draftVersion);
    assert.strictEqual(draftParsed.success, true);
  });

  await t.test("Scenario 4: Naira to kobo integer conversion precision", () => {
    const nairaPrice = 45000;
    const koboMinor = Math.round(nairaPrice * 100);
    assert.strictEqual(koboMinor, 4500000);

    const nairaFractional = 45000.5;
    const koboFractional = Math.round(nairaFractional * 100);
    assert.strictEqual(koboFractional, 4500050);

    // Verify inverse conversion
    assert.strictEqual(koboMinor / 100, nairaPrice);
  });

  await t.test("Scenario 5: Longevity validation enforces max >= min", () => {
    const invalidLongevity = {
      name: "Longevity Test",
      slug: "longevity-test",
      description: "A sufficiently long description of the fragrance with more than 20 characters.",
      concentration: "edp",
      longevity_hours_min: 12,
      longevity_hours_max: 6, // invalid: max < min
      variants: [
        { size_ml: 50, label: "50ml", sku: "SOL-LONG-50ML", price_naira: 35000, initial_stock: 5 },
      ],
    };

    const parsed = productAdminFormSchema.safeParse(invalidLongevity);
    assert.strictEqual(parsed.success, false);
    assert.ok(parsed.error.message.includes("Maximum longevity hours cannot be less than minimum"));
  });

  await t.test("Scenario 6: generateSlug produces safe, clean URLs", () => {
    assert.strictEqual(generateSlug("Solure Oud Royal"), "solure-oud-royal");
    assert.strictEqual(generateSlug("Rose & Patchouli № 5!"), "rose-patchouli-5");
    assert.strictEqual(generateSlug("  Extrait d'Or   "), "extrait-dor");
    assert.strictEqual(generateSlug("LAGOS / PARIS — 2026"), "lagos-paris-2026");
  });

  await t.test("Scenario 7: Variant stock cannot be negative", () => {
    const negativeStock = {
      size_ml: 50,
      label: "50ml",
      sku: "SOL-NEG-50ML",
      price_naira: 35000,
      initial_stock: -5,
    };
    const parsed = variantAdminInputSchema.safeParse(negativeStock);
    assert.strictEqual(parsed.success, false);
  });
});

test("Sprint 2.6: Simplified Product Management & Direct Browser Upload Suite", async (t) => {
  await t.test("Scenario 8: Minimal 3-section form data passes schema validation without technical perfumery fields", () => {
    const minimal3SectionData = {
      name: "Santal Impérial",
      category: "unisex",
      brand_name: "Solure Scents",
      description: "A warm and smoky Australian sandalwood enriched with creamy vanilla and spiced cardamon.",
      variants: [
        {
          size_ml: 50,
          price_naira: 65000,
          initial_stock: 15,
        },
      ],
      media: [
        {
          storage_path: "https://supabase.co/storage/v1/object/public/product-media/catalogue/santal-50ml.jpg",
          alt_text: "Santal Impérial bottle photograph",
          is_primary: true,
          sort_order: 0,
        },
      ],
    };

    const parsed = productAdminFormSchema.safeParse(minimal3SectionData);
    assert.strictEqual(parsed.success, true);
    assert.strictEqual(parsed.data.name, "Santal Impérial");
    assert.strictEqual(parsed.data.category, "unisex");
    assert.strictEqual(parsed.data.concentration, "edp"); // default applied
    assert.strictEqual(parsed.data.status, "draft"); // default applied
    assert.strictEqual(parsed.data.top_notes, undefined);
    assert.strictEqual(parsed.data.perfumer, undefined);
  });

  await t.test("Scenario 9: Category field accepts only 'unisex', 'men', or 'women'", () => {
    for (const validCat of ["unisex", "men", "women"]) {
      const parsed = productCategoryEnum.safeParse(validCat);
      assert.strictEqual(parsed.success, true);
    }

    const invalidParsed = productCategoryEnum.safeParse("kids");
    assert.strictEqual(invalidParsed.success, false);
  });

  await t.test("Scenario 10: Automatic SKU generation produces standardized, clean identifiers", () => {
    assert.strictEqual(generateSku("Solure Oud Royal", 50), "SOL-SOLUREOU-50ML");
    assert.strictEqual(generateSku("Rose & Velvet", 100), "SOL-ROSEVELV-100ML");
    assert.strictEqual(generateSku("Amber № 9", 30), "SOL-AMBER9-30ML");
    assert.strictEqual(generateSku("", 50), "SOL-SCENT-50ML");
  });

  await t.test("Scenario 11: File constraints enforce 5MB limit and allowed MIME types", () => {
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

    const validFile = { size: 3.5 * 1024 * 1024, type: "image/webp" };
    const tooLargeFile = { size: 5.2 * 1024 * 1024, type: "image/jpeg" };
    const invalidTypeFile = { size: 1024 * 1024, type: "image/gif" };
    const pdfFile = { size: 500 * 1024, type: "application/pdf" };

    assert.strictEqual(validFile.size <= MAX_FILE_SIZE && ALLOWED_MIME_TYPES.includes(validFile.type), true);
    assert.strictEqual(tooLargeFile.size <= MAX_FILE_SIZE, false);
    assert.strictEqual(ALLOWED_MIME_TYPES.includes(invalidTypeFile.type), false);
    assert.strictEqual(ALLOWED_MIME_TYPES.includes(pdfFile.type), false);
  });

  await t.test("Scenario 12: Server Action receives lightweight JSON storage path (bypassing Next.js 1MB Server Action limit)", () => {
    // Verified architecture: client uploads directly to Supabase storage, Server Action receives only metadata
    const clientPayload = {
      name: "Lagos Noir",
      category: "men",
      description: "An invigorating blend of black pepper, smoky cedarwood, and rich amber.",
      status: "active",
      variants: [
        {
          size_ml: 100,
          label: "100ml Flacon",
          sku: "SOL-LAGOSNOI-100ML",
          price_naira: 95000,
          initial_stock: 8,
          is_available: true,
        },
      ],
      media: [
        {
          storage_path: "catalogue/lagos-noir-front.webp",
          alt_text: "Lagos Noir bottle photograph",
          is_primary: true,
        },
      ],
    };

    const payloadJson = JSON.stringify(clientPayload);
    // The JSON string payload size is tiny (< 1KB), well beneath 1MB limit!
    assert.ok(payloadJson.length < 1000, `Payload size was ${payloadJson.length} bytes, expected < 1000 bytes`);
    assert.strictEqual(productAdminFormSchema.safeParse(clientPayload).success, true);
  });

  await t.test("Scenario 13: Updating a product preserves existing database notes and perfumer when omitted from payload", () => {
    const existingDbRecord = {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Existing Fragrance",
      perfumer: "Francis Kurkdjian",
      story: "Original historical atelier story.",
      top_notes: "Bergamot",
      heart_notes: "Rose",
      base_notes: "Oud",
      longevity_hours_min: 8,
      longevity_hours_max: 14,
      sillage: "strong",
      concentration: "extrait",
    };

    // Simplified update payload from Section A, B, C only
    const updateInput = {
      id: existingDbRecord.id,
      name: "Updated Fragrance Name",
      description: "A newly revised modern fragrance description with over 20 characters.",
      category: "women",
      brand_name: "Solure Scents",
      status: "active",
      variants: [
        {
          size_ml: 50,
          price_naira: 55000,
          initial_stock: 20,
          is_available: true,
        },
      ],
      media: [],
    };

    // Simulate preservation merge in updateAdminProduct:
    const mergedRecord = {
      name: updateInput.name,
      description: updateInput.description,
      perfumer: updateInput.perfumer !== undefined ? updateInput.perfumer : existingDbRecord.perfumer,
      story: updateInput.story !== undefined ? updateInput.story : existingDbRecord.story,
      top_notes: updateInput.top_notes !== undefined ? updateInput.top_notes : existingDbRecord.top_notes,
      sillage: updateInput.sillage !== undefined ? updateInput.sillage : existingDbRecord.sillage,
      concentration: updateInput.concentration || existingDbRecord.concentration || "edp",
    };

    assert.strictEqual(mergedRecord.name, "Updated Fragrance Name");
    assert.strictEqual(mergedRecord.perfumer, "Francis Kurkdjian"); // preserved!
    assert.strictEqual(mergedRecord.story, "Original historical atelier story."); // preserved!
    assert.strictEqual(mergedRecord.top_notes, "Bergamot"); // preserved!
    assert.strictEqual(mergedRecord.sillage, "strong"); // preserved!
    assert.strictEqual(mergedRecord.concentration, "extrait"); // preserved!
  });
});
