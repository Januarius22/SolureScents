import type { Metadata } from "next";

import { CollectionsExperience } from "@/features/storefront/components/collections-experience";
import { getCollections } from "@/features/storefront/services/storefront-service";

export const metadata: Metadata = {
  title: "Collections",
  description:
    "Explore fragrance collections arranged by mood, memory, and the moments they are made to accompany.",
};

export default async function CollectionsPage() {
  const collections = await getCollections();

  return <CollectionsExperience collections={collections} />;
}
