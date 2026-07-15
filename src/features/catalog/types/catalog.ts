export type ProductStatus = "draft" | "active" | "archived";
export type VariantStatus = "draft" | "active" | "discontinued";
export type FragranceConcentration = "edc" | "edt" | "edp" | "parfum" | "extrait" | "oil";
export type SillageLevel = "intimate" | "moderate" | "strong" | "enormous";

export interface Money {
  amountMinor: number;
  currency: string;
}

export interface ProductVariantSummary {
  id: string;
  label: string;
  price: Money;
  sizeMl: number;
  sku: string;
}

export interface ProductSummary {
  brandId: string;
  concentration: FragranceConcentration;
  id: string;
  name: string;
  slug: string;
  subtitle: string | null;
  variants: ProductVariantSummary[];
}
