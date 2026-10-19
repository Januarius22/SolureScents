import type { Metadata } from "next";
import { headers } from "next/headers";

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
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";
  const isMobile = /mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(userAgent);

  const rawMinPrice = readString(params.minPrice);
  const rawMaxPrice = readString(params.maxPrice);
  const minPriceNum = rawMinPrice ? Number(rawMinPrice) : undefined;
  const maxPriceNum = rawMaxPrice ? Number(rawMaxPrice) : undefined;

  // Resiliently support either Naira or minor kobo
  const minPriceMinor =
    minPriceNum !== undefined && !Number.isNaN(minPriceNum)
      ? minPriceNum > 1000000
        ? minPriceNum
        : minPriceNum * 100
      : undefined;

  const maxPriceMinor =
    maxPriceNum !== undefined && !Number.isNaN(maxPriceNum)
      ? maxPriceNum > 1000000
        ? maxPriceNum
        : maxPriceNum * 100
      : undefined;

  const rawLimit = readString(params.limit);
  const parsedLimit = rawLimit ? Number(rawLimit) : undefined;
  const activeLimit =
    parsedLimit && !Number.isNaN(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 48)
      : isMobile
      ? 10
      : 15;

  const rawPage = readString(params.page);
  const parsedPage = rawPage ? Number(rawPage) : undefined;
  const activePage =
    parsedPage && !Number.isNaN(parsedPage) && parsedPage > 0
      ? Math.floor(parsedPage)
      : 1;

  const parsedFilters = productFiltersSchema.safeParse({
    page: activePage,
    limit: activeLimit,
    query: readString(params.q),
    brandId: readString(params.brand),
    collectionId: readString(params.collectionId),
    collection: readString(params.collection),
    category: readString(params.category),
    concentration: readString(params.concentration),
    familyId: readString(params.family),
    sort: readString(params.sort) ?? "newest",
    minimumPriceMinor: minPriceMinor,
    maximumPriceMinor: maxPriceMinor,
  });
  const filters = parsedFilters.success
    ? parsedFilters.data
    : productFiltersSchema.parse({ limit: activeLimit, page: 1 });

  const [result, facets] = await Promise.all([
    listPublishedProducts(filters),
    getCatalogFacets(),
  ]);

  const activeFilters: ShopFilterState = {
    brandId: filters.brandId,
    category: filters.category,
    collection: filters.collection,
    collectionId: filters.collectionId,
    concentration: filters.concentration,
    familyId: filters.familyId,
    limit: rawLimit ? activeLimit : undefined,
    maxPrice: filters.maximumPriceMinor ? filters.maximumPriceMinor / 100 : undefined,
    minPrice: filters.minimumPriceMinor ? filters.minimumPriceMinor / 100 : undefined,
    query: filters.query || undefined,
    sort: filters.sort,
  };

  return <ShopExperience facets={facets} filters={activeFilters} result={result} />;
}
