import type { Metadata } from "next";

import { BrandsExperience } from "@/features/storefront/components/brands-experience";
import { getBrands } from "@/features/storefront/services/storefront-service";

export const metadata: Metadata = {
  title: "Fragrance Houses & Perfumers",
  description:
    "Explore the independent perfume houses, historic Grasse ateliers, and modern creators represented by Solure Scents.",
};

export default async function BrandsPage() {
  const brands = await getBrands();

  return <BrandsExperience initialBrands={brands} />;
}
