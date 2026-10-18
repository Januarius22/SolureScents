import { Boxes, ExternalLink, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { getAdminProducts } from "@/features/admin/services/commerce-operations";
import { ProductListClient } from "@/features/admin/components/product-list-client";

export const metadata: Metadata = {
  title: "Catalogue & Perfume Administration | Solure Scents",
};

export default async function AdminProductsPage() {
  const products = await getAdminProducts();

  const totalVariants = products.reduce((sum, p) => sum + p.variants.length, 0);
  const activeProducts = products.filter((p) => p.status === "active").length;
  const draftProducts = products.filter((p) => p.status === "draft").length;
  const totalStockUnits = products.reduce(
    (sum, p) => sum + p.variants.reduce((vSum, v) => vSum + (v.on_hand - v.reserved), 0),
    0,
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-charcoal/10 pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
            Catalogue Management
          </p>
          <h1 className="mt-2 font-display text-4xl text-charcoal sm:text-5xl">
            Fragrance Products
          </h1>
          <p className="mt-2 text-sm text-muted">
            Create, photograph, price, and manage luxury perfume editions, sizes, and stock.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/inventory"
            className="inline-flex min-h-11 items-center gap-2 border border-charcoal/20 bg-white px-4 text-xs font-semibold tracking-wider text-charcoal uppercase transition-colors hover:border-gold hover:text-gold"
          >
            <Boxes size={14} />
            <span>Inventory Allocations</span>
          </Link>

          <Link
            href="/shop"
            target="_blank"
            className="inline-flex min-h-11 items-center gap-1.5 border border-charcoal/20 bg-white px-4 text-xs font-semibold tracking-wider text-charcoal uppercase transition-colors hover:border-gold hover:text-gold"
          >
            <span>Public Shop</span>
            <ExternalLink size={13} />
          </Link>

          {/* Prominent Add New Perfume button */}
          <Link
            href="/admin/products/new"
            className="inline-flex min-h-11 items-center gap-2 bg-charcoal px-5 text-xs font-semibold tracking-[0.14em] text-pearl uppercase transition-all hover:bg-gold hover:text-charcoal shadow-sm"
          >
            <Plus size={16} />
            <span>+ Add New Perfume</span>
          </Link>
        </div>
      </div>

      {/* Overview Stat Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Total Fragrances</p>
          <p className="mt-2 font-display text-3xl text-charcoal">{products.length}</p>
          <p className="mt-1 text-xs text-muted">{activeProducts} live · {draftProducts} drafts</p>
        </div>
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Bottle Formats</p>
          <p className="mt-2 font-display text-3xl text-charcoal">{totalVariants}</p>
          <p className="mt-1 text-xs text-muted">Active size variants</p>
        </div>
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Total Stock</p>
          <p className="mt-2 font-display text-3xl text-emerald-800">{totalStockUnits} units</p>
          <p className="mt-1 text-xs text-muted">Across all warehouse allocations</p>
        </div>
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Integrity Mode</p>
          <p className="mt-2 font-display text-3xl text-gold">Strict RLS</p>
          <p className="mt-1 text-xs text-muted">PostgreSQL ledger audit active</p>
        </div>
      </div>

      {/* Interactive Products List Client */}
      <ProductListClient initialProducts={products} />
    </div>
  );
}
