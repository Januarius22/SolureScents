import { ArrowUpRight, Boxes, ExternalLink, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Money } from "@/components/account/account-ui";
import { getAdminProducts } from "@/features/admin/services/commerce-operations";

export const metadata: Metadata = {
  title: "Products & Variants Administration | Solure Scents",
};

export default async function AdminProductsPage() {
  const products = await getAdminProducts();

  const totalVariants = products.reduce((sum, p) => sum + p.variants.length, 0);
  const activeProducts = products.filter((p) => p.status === "active").length;

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
            Manage catalogue flacons, variant sizes, pricing in minor units, and inventory allocation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/inventory"
            className="inline-flex min-h-10 items-center gap-2 border border-charcoal/20 bg-white px-4 text-xs font-semibold tracking-wider text-charcoal uppercase transition-colors hover:border-gold hover:text-gold"
          >
            <Boxes size={14} />
            <span>Inventory Allocations</span>
          </Link>
          <Link
            href="/shop"
            target="_blank"
            className="inline-flex min-h-10 items-center gap-2 bg-charcoal px-4 text-xs font-semibold tracking-wider text-pearl uppercase transition-colors hover:bg-gold hover:text-charcoal"
          >
            <span>Public Shop</span>
            <ExternalLink size={13} />
          </Link>
        </div>
      </div>

      {/* Overview Stat Bar */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Total Products</p>
          <p className="mt-2 font-display text-3xl text-charcoal">{products.length}</p>
          <p className="mt-1 text-xs text-muted">{activeProducts} live on storefront</p>
        </div>
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Active Variants</p>
          <p className="mt-2 font-display text-3xl text-charcoal">{totalVariants}</p>
          <p className="mt-1 text-xs text-muted">Sizes & bottle formats</p>
        </div>
        <div className="border border-charcoal/10 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Integrity Mode</p>
          <p className="mt-2 font-display text-3xl text-emerald-700">Strict</p>
          <p className="mt-1 text-xs text-muted">Protected by PostgreSQL RLS</p>
        </div>
      </div>

      {/* Products List */}
      <div className="space-y-6">
        {products.map((product) => (
          <article
            key={product.id}
            className="border border-charcoal/15 bg-white p-6 shadow-soft transition-shadow hover:shadow-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-charcoal/10 pb-5">
              <div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block border px-2 py-0.5 rounded-full text-[0.6rem] font-semibold tracking-wider uppercase ${
                      product.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-zinc-100 text-zinc-700 border-zinc-300"
                    }`}
                  >
                    {product.status}
                  </span>
                  <span className="text-xs font-semibold tracking-wider text-gold uppercase">
                    {product.concentration}
                  </span>
                </div>
                <h2 className="mt-2 font-display text-3xl text-charcoal">{product.name}</h2>
                {product.subtitle && (
                  <p className="mt-1 text-xs text-muted">{product.subtitle}</p>
                )}
              </div>

              <Link
                href={`/shop/${product.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal hover:text-gold uppercase tracking-wider"
              >
                <span>View on storefront</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {/* Variants table */}
            <div className="mt-5">
              <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-muted uppercase">
                Product Variants & Sizes ({product.variants.length})
              </p>

              {product.variants.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-charcoal/10 text-muted uppercase tracking-wider">
                        <th className="py-2.5 pr-4 font-semibold">Size / Label</th>
                        <th className="py-2.5 px-4 font-semibold">SKU</th>
                        <th className="py-2.5 px-4 font-semibold">Price</th>
                        <th className="py-2.5 px-4 font-semibold text-center">On Hand</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Reserved</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Available</th>
                        <th className="py-2.5 pl-4 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal/5">
                      {product.variants.map((v) => {
                        const available = v.on_hand - v.reserved;
                        const isLow = available <= v.low_stock_limit;

                        return (
                          <tr key={v.id} className="hover:bg-ivory/50">
                            <td className="py-3 pr-4 font-medium text-charcoal">
                              {v.label} ({v.size_ml} ml)
                            </td>
                            <td className="py-3 px-4 font-mono text-muted">{v.sku}</td>
                            <td className="py-3 px-4 font-medium text-charcoal">
                              <Money amount={v.price_minor} currency={v.currency} />
                            </td>
                            <td className="py-3 px-4 text-center font-mono">{v.on_hand}</td>
                            <td className="py-3 px-4 text-center font-mono text-muted">{v.reserved}</td>
                            <td className="py-3 px-4 text-center font-mono">
                              <span
                                className={`font-bold ${
                                  isLow ? "text-amber-700 font-extrabold" : "text-emerald-700"
                                }`}
                              >
                                {available}
                              </span>
                            </td>
                            <td className="py-3 pl-4 text-right">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[0.62rem] uppercase font-semibold ${
                                  v.is_available
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-zinc-100 text-zinc-500"
                                }`}
                              >
                                {v.is_available ? "Available" : "Unavailable"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted">No variants created for this product yet.</p>
              )}
            </div>
          </article>
        ))}

        {products.length === 0 && (
          <div className="border border-dashed border-charcoal/20 bg-white p-16 text-center">
            <Package size={32} className="mx-auto text-gold/40 mb-3" />
            <h3 className="font-display text-2xl text-charcoal">No products in catalogue</h3>
            <p className="mt-1 text-xs text-muted">
              Add products in Supabase or run migration seeds to populate the fragrance edit.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
