import { z } from "zod";

export const productFiltersSchema = z.object({
  brandId: z.uuid().optional(),
  collectionId: z.uuid().optional(),
  concentration: z.enum(["edc", "edt", "edp", "parfum", "extrait", "oil"]).optional(),
  familyId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24),
  maximumPriceMinor: z.coerce.number().int().nonnegative().optional(),
  minimumPriceMinor: z.coerce.number().int().nonnegative().optional(),
  page: z.coerce.number().int().min(1).default(1),
  query: z.string().trim().max(100).optional(),
}).refine(
  ({ maximumPriceMinor, minimumPriceMinor }) =>
    maximumPriceMinor === undefined || minimumPriceMinor === undefined || maximumPriceMinor >= minimumPriceMinor,
  { message: "Maximum price must not be lower than minimum price.", path: ["maximumPriceMinor"] },
);

export type ProductFilters = z.infer<typeof productFiltersSchema>;

export const productSlugSchema = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180);
