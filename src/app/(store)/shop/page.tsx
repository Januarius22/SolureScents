import type { Metadata } from "next";

import {
  ShopExperience,
  type ShopFilterState,
} from "@/features/catalog/components/shop-experience";
import {
  getCatalogFacets,
  listPublishedProducts,
} from "@/features/catalog/services/catalog-service";
import { productFiltersSchema } from "@/features/catalog/validation/catalog";

export const metadata: Metadata = {
  title: "Shop fragrances",
  description: "Explore Solure Scents' edited collection of remarkable fragrances.",
};

const readString = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const params = await searchParams;
  const parsedFilters = productFiltersSchema.safeParse({
    page: readString(params.page) ?? 1,
    limit: 24,
    query: readString(params.q),
    brandId: readString(params.brand),
    collectionId: readString(params.collection),
    concentration: readString(params.concentration),
    familyId: readString(params.family),
  });
  const filters = parsedFilters.success
    ? parsedFilters.data
    : productFiltersSchema.parse({ limit: 24, page: 1 });

  const [result, facets] = await Promise.all([
    listPublishedProducts(filters),
    getCatalogFacets(),
  ]);

  const activeFilters: ShopFilterState = {
    brandId: filters.brandId,
    collectionId: filters.collectionId,
    concentration: filters.concentration,
    familyId: filters.familyId,
    query: filters.query || undefined,
  };

  return <ShopExperience facets={facets} filters={activeFilters} result={result} />;
}
