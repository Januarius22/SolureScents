"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Archive,
  ArrowUpRight,
  Edit,
  Eye,
  EyeOff,
  Filter,
  Loader2,
  Package,
  Plus,
  Search,
} from "lucide-react";

import {
  archiveProductAction,
  toggleProductStatusAction,
} from "@/features/admin/actions/product-admin-actions";
import type { AdminProductWithVariants } from "@/features/admin/services/commerce-operations";
import { ProductVisual } from "@/components/store/product-visual";
import { formatMoney } from "@/lib/utils/money";

interface ProductListClientProps {
  initialProducts: AdminProductWithVariants[];
}

export function ProductListClient({ initialProducts }: ProductListClientProps) {
  const [products, setProducts] = useState(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Status toggle handler
  const handleToggleStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "draft" : "active";
    setActioningId(id);

    startTransition(async () => {
      const res = await toggleProductStatusAction(id, nextStatus as "draft" | "active");
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: nextStatus } : p)),
        );
      } else {
        alert(res.message || "Failed to update product status.");
      }
      setActioningId(null);
    });
  };

  // Archive handler
  const handleArchive = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to archive "${name}"? It will be delisted from the storefront while keeping past order history intact.`)) {
      return;
    }
    setActioningId(id);

    startTransition(async () => {
      const res = await archiveProductAction(id);
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "archived" } : p)),
        );
      } else {
        alert(res.message || "Failed to archive product.");
      }
      setActioningId(null);
    });
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand_name && p.brand_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ? true : p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-4 border border-charcoal/10 bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search perfumes by name, brand, or slug..."
            className="min-h-10 w-full border border-charcoal/20 bg-ivory/20 pl-10 pr-4 text-xs text-charcoal outline-none transition focus:border-gold focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-10 border border-charcoal/20 bg-ivory/20 px-3 text-xs text-charcoal outline-none transition focus:border-gold focus:bg-white"
          >
            <option value="all">All Statuses ({products.length})</option>
            <option value="active">Active / Published ({products.filter((p) => p.status === "active").length})</option>
            <option value="draft">Drafts ({products.filter((p) => p.status === "draft").length})</option>
            <option value="archived">Archived ({products.filter((p) => p.status === "archived").length})</option>
          </select>
        </div>
      </div>

      {/* Product List */}
      <div className="space-y-6">
        {filteredProducts.map((product) => {
          const prices = product.variants.map((v) => v.price_minor);
          const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
          const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
          const totalStock = product.variants.reduce((sum, v) => sum + (v.on_hand - v.reserved), 0);
          const hasLowStock = product.variants.some(
            (v) => v.on_hand - v.reserved <= v.low_stock_limit && v.is_available,
          );

          const isActioning = actioningId === product.id;

          return (
            <article
              key={product.id}
              className="border border-charcoal/15 bg-white p-6 shadow-soft transition-shadow hover:shadow-md"
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                {/* Left: Thumbnail + Basic Info */}
                <div className="flex items-start gap-5">
                  {/* Image Thumbnail */}
                  <div className="relative size-24 shrink-0 overflow-hidden border border-charcoal/10 bg-ivory">
                    {product.primary_image_url ? (
                      <Image
                        src={product.primary_image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        unoptimized={product.primary_image_url.startsWith("http://localhost")}
                      />
                    ) : (
                      <ProductVisual className="size-full" label={product.name.slice(0, 6)} />
                    )}
                  </div>

                  {/* Metadata */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-block border px-2 py-0.5 rounded-full text-[0.6rem] font-semibold tracking-wider uppercase ${
                          product.status === "active"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : product.status === "draft"
                            ? "bg-amber-50 text-amber-800 border-amber-300"
                            : "bg-zinc-100 text-zinc-600 border-zinc-300"
                        }`}
                      >
                        {product.status}
                      </span>
                      <span className="text-[0.66rem] font-semibold tracking-wider text-gold uppercase">
                        {product.brand_name || "Solure Scents"} · {product.concentration}
                      </span>
                    </div>

                    <h2 className="mt-1.5 font-display text-2xl text-charcoal sm:text-3xl">
                      {product.name}
                    </h2>

                    {product.subtitle && (
                      <p className="mt-0.5 text-xs text-muted">{product.subtitle}</p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                      <div>
                        <span className="text-muted">Price: </span>
                        <span className="font-semibold text-charcoal">
                          {minPrice === maxPrice
                            ? formatMoney(minPrice, "NGN")
                            : `${formatMoney(minPrice, "NGN")} – ${formatMoney(maxPrice, "NGN")}`}
                        </span>
                      </div>

                      <span className="text-charcoal/20">|</span>

                      <div>
                        <span className="text-muted">Total Available: </span>
                        <span
                          className={`font-bold ${
                            hasLowStock ? "text-amber-700" : "text-emerald-700"
                          }`}
                        >
                          {totalStock} units
                        </span>
                        {hasLowStock && (
                          <span className="ml-1.5 inline-block rounded bg-amber-100 px-1.5 py-0.2 text-[0.6rem] font-semibold text-amber-800 uppercase">
                            Low Stock
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Actions Bar */}
                <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                  {product.status === "active" ? (
                    <Link
                      href={`/shop/${product.slug}`}
                      target="_blank"
                      className="inline-flex min-h-9 items-center gap-1.5 border border-charcoal/20 bg-white px-3 text-[0.68rem] font-semibold tracking-wider text-charcoal uppercase transition hover:border-gold hover:text-gold"
                      title="View live storefront page"
                    >
                      <ArrowUpRight size={13} />
                      <span>Storefront</span>
                    </Link>
                  ) : null}

                  {/* Quick Status Toggle */}
                  {product.status !== "archived" && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggleStatus(product.id, product.status)}
                      className={`inline-flex min-h-9 items-center gap-1.5 border px-3 text-[0.68rem] font-semibold tracking-wider uppercase transition ${
                        product.status === "active"
                          ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                          : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      }`}
                    >
                      {isActioning ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : product.status === "active" ? (
                        <EyeOff size={13} />
                      ) : (
                        <Eye size={13} />
                      )}
                      <span>{product.status === "active" ? "Unpublish" : "Publish"}</span>
                    </button>
                  )}

                  {/* Edit action */}
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="inline-flex min-h-9 items-center gap-1.5 bg-charcoal px-4 text-[0.68rem] font-semibold tracking-wider text-pearl uppercase transition hover:bg-gold hover:text-charcoal"
                  >
                    <Edit size={13} />
                    <span>Edit</span>
                  </Link>

                  {/* Archive action */}
                  {product.status !== "archived" && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleArchive(product.id, product.name)}
                      className="inline-flex min-h-9 items-center gap-1 border border-charcoal/10 bg-white px-2.5 text-[0.68rem] font-semibold tracking-wider text-muted uppercase transition hover:border-rose-300 hover:text-rose-700"
                      title="Archive fragrance (soft delete)"
                    >
                      <Archive size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Variants table */}
              <div className="mt-5 border-t border-charcoal/10 pt-4">
                <p className="text-[0.66rem] font-semibold tracking-[0.16em] text-muted uppercase">
                  Available Formats & Stock Allocations ({product.variants.length})
                </p>

                {product.variants.length > 0 ? (
                  <div className="mt-2.5 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-charcoal/10 text-muted uppercase tracking-wider text-[0.64rem]">
                          <th className="py-2 pr-4 font-semibold">Format / Size</th>
                          <th className="py-2 px-4 font-semibold">SKU</th>
                          <th className="py-2 px-4 font-semibold">Price (₦)</th>
                          <th className="py-2 px-4 font-semibold text-center">On Hand</th>
                          <th className="py-2 px-4 font-semibold text-center">Reserved</th>
                          <th className="py-2 px-4 font-semibold text-center">Available</th>
                          <th className="py-2 pl-4 font-semibold text-right">Sale Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-charcoal/5">
                        {product.variants.map((v) => {
                          const available = v.on_hand - v.reserved;
                          const isLow = available <= v.low_stock_limit && v.is_available;

                          return (
                            <tr key={v.id} className="hover:bg-ivory/50">
                              <td className="py-2.5 pr-4 font-medium text-charcoal">
                                {v.label} ({v.size_ml} ml)
                              </td>
                              <td className="py-2.5 px-4 font-mono text-muted text-[0.68rem]">{v.sku}</td>
                              <td className="py-2.5 px-4 font-bold text-charcoal">
                                {formatMoney(v.price_minor, v.currency)}
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono">{v.on_hand}</td>
                              <td className="py-2.5 px-4 text-center font-mono text-muted">{v.reserved}</td>
                              <td className="py-2.5 px-4 text-center font-mono">
                                <span
                                  className={`font-bold ${
                                    isLow ? "text-amber-700 font-extrabold" : "text-emerald-700"
                                  }`}
                                >
                                  {available}
                                </span>
                              </td>
                              <td className="py-2.5 pl-4 text-right">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[0.62rem] uppercase font-semibold ${
                                    v.is_available
                                      ? "bg-emerald-50 text-emerald-800"
                                      : "bg-zinc-100 text-zinc-500"
                                  }`}
                                >
                                  {v.is_available ? "Available" : "Hidden"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted">No variants created for this product yet.</p>
                )}
              </div>
            </article>
          );
        })}

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="border-2 border-dashed border-charcoal/20 bg-white p-16 text-center shadow-soft">
            <Package size={44} className="mx-auto text-gold mb-4" />
            <h3 className="font-display text-3xl text-charcoal">
              {products.length === 0 ? "No perfumes in catalogue yet" : "No perfumes match your search"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              {products.length === 0
                ? "Start building your luxury fragrance catalogue. Add your first flacon with photos, olfactory notes, and bottle sizes in seconds."
                : "Try adjusting your search terms or clearing the status filter to find what you're looking for."}
            </p>
            {products.length === 0 ? (
              <div className="mt-6">
                <Link
                  href="/admin/products/new"
                  className="inline-flex min-h-12 items-center gap-2 bg-charcoal px-8 text-xs font-semibold tracking-[0.16em] text-pearl uppercase transition hover:bg-gold hover:text-charcoal shadow-md"
                >
                  <Plus size={16} />
                  <span>Create Your First Fragrance</span>
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
