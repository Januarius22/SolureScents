import { z } from "zod";

export const fragranceConcentrationEnum = z.enum(["edc", "edt", "edp", "parfum", "extrait", "oil"]);
export const sillageLevelEnum = z.enum(["intimate", "moderate", "strong", "enormous"]);
export const productStatusEnum = z.enum(["draft", "active", "archived"]);
export const variantStatusEnum = z.enum(["draft", "active", "discontinued"]);
export const notePositionEnum = z.enum(["top", "heart", "base"]);
export const productCategoryEnum = z.enum(["unisex", "men", "women"]);
export const perfumeCollectionEnum = z.enum(["premium", "regular"]);

/** Utility to convert a title to a URL-safe lowercase slug */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Utility to generate standard SKU automatically */
export function generateSku(productName: string, sizeMl: number): string {
  const cleanName = (productName || "SCENT")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  return `SOL-${cleanName || "SCENT"}-${sizeMl}ML`;
}

export const variantAdminInputSchema = z.object({
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

export const productMediaInputSchema = z.object({
  id: z.string().uuid().optional(),
  storage_path: z.string().trim().min(1, "Media path or URL is required"),
  alt_text: z.string().trim().min(2, "Alt text must be at least 2 characters").max(180),
  is_primary: z.boolean().default(false),
  sort_order: z.coerce.number().int().default(0),
  media_type: z.enum(["image", "video"]).default("image"),
});

export const productAdminFormSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2, "Perfume name must be at least 2 characters").max(160),
    slug: z.string().trim().optional(),
    brand_name: z.string().trim().min(2, "Brand name must be at least 2 characters").max(120).default("Solure Scents"),
    brand_id: z.string().uuid().optional().nullable(),
    category: productCategoryEnum.default("unisex"),
    collection: perfumeCollectionEnum.default("regular"),
    subtitle: z.string().trim().max(255).optional().nullable(),
    description: z
      .string()
      .trim()
      .min(20, "Description must be at least 20 characters")
      .max(10000, "Description must not exceed 10,000 characters"),
    // Optional / Preserved advanced fields
    family_name: z.string().trim().max(80).optional().nullable(),
    family_id: z.string().uuid().optional().nullable(),
    story: z.string().trim().max(10000).optional().nullable(),
    concentration: fragranceConcentrationEnum.default("edp"),
    perfumer: z.string().trim().max(120).optional().nullable(),
    launch_year: z.coerce
      .number()
      .int()
      .min(1700)
      .max(new Date().getFullYear() + 1)
      .optional()
      .nullable(),
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

export type ProductAdminFormValues = z.infer<typeof productAdminFormSchema>;
export type VariantAdminInput = z.infer<typeof variantAdminInputSchema>;
export type ProductMediaInput = z.infer<typeof productMediaInputSchema>;
export type ProductCategory = z.infer<typeof productCategoryEnum>;
