import type { Metadata } from "next";
import { EmptyCatalogue } from "@/components/store/empty-catalogue";
import { ProductCard } from "@/components/store/product-card";
import { listPublishedProducts } from "@/features/catalog/services/catalog-service";

export const metadata: Metadata = { title: "Shop fragrances", description: "Explore Solure Scents' edited collection of remarkable fragrances." };

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const params = await searchParams;
  const result = await listPublishedProducts({ page: typeof params.page === "string" ? Number(params.page) : 1, limit: 24, query: typeof params.q === "string" ? params.q : undefined, collectionId: typeof params.collection === "string" ? params.collection : undefined });
  return <div className="mx-auto max-w-[90rem] px-5 py-16 sm:px-8 lg:px-12"><div className="flex flex-col justify-between gap-6 border-b pb-10 sm:flex-row sm:items-end"><div><p className="text-xs tracking-[0.2em] text-gold uppercase">The collection</p><h1 className="mt-3 font-display text-6xl">Fragrances</h1></div><p className="max-w-md text-sm leading-6 text-muted">An edited wardrobe of scents chosen for character, craft, and the memories they leave behind.</p></div>{result.items.length ? <div className="grid gap-x-6 gap-y-14 py-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{result.items.map(product=><ProductCard key={product.id} product={product}/>)}</div> : <div className="py-14"><EmptyCatalogue filtered={Boolean(params.q)}/></div>}</div>;
}
