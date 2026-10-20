"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArrowUpRight,
  ChevronDown,
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [actioningId, setActioningId] = useState<string | null>(null);

  const [pageSize, setPageSize] = useState<number>(10); // const pageSize = 10;

  // Toggle individual product card expansion
  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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
    if (
      !confirm(
        `Are you sure you want to archive "${name}"? It will be delisted from the storefront while keeping past order history intact.`,
      )
    ) {
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
      Boolean(p.brand_name && p.brand_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ? true : p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Reset to page 1 when search or filter changes
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const totalProducts = filteredProducts.length;
  const totalPages = Math.ceil(totalProducts / pageSize);
  const validPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const pagedProducts = filteredProducts.slice(
    (validPage - 1) * pageSize,
    validPage * pageSize,
  );

  const fromIndex = totalProducts > 0 ? (validPage - 1) * pageSize + 1 : 0;
  const toIndex = Math.min(validPage * pageSize, totalProducts);

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-4 border border-charcoal/10 bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search perfumes by name, brand, or slug..."
            className="min-h-10 w-full border border-charcoal/20 bg-ivory/20 pl-10 pr-4 text-xs text-charcoal outline-none transition focus:border-gold focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="min-h-10 border border-charcoal/20 bg-ivory/20 px-3 text-xs text-charcoal outline-none transition focus:border-gold focus:bg-white"
          >
            <option value="all">All Statuses ({products.length})</option>
            <option value="active">Active / Published ({products.filter((p) => p.status === "active").length})</option>
            <option value="draft">Drafts ({products.filter((p) => p.status === "draft").length})</option>
            <option value="archived">Archived ({products.filter((p) => p.status === "archived").length})</option>
          </select>
        </div>
      </div>

      {/* Results Count Summary */}
      <div className="flex items-center justify-between text-xs text-muted">
        <p>
          {totalProducts > pageSize ? (
            <>
              Showing <strong className="text-charcoal font-semibold">{fromIndex}–{toIndex}</strong> of{" "}
              <strong className="text-charcoal font-semibold">{totalProducts}</strong> fragrances
            </>
          ) : (
            <>
              Showing <strong className="text-charcoal font-semibold">{totalProducts}</strong> fragrances
            </>
          )}
        </p>

        {totalProducts > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (expandedIds.size === pagedProducts.length) {
                  setExpandedIds(new Set());
                } else {
                  setExpandedIds(new Set(pagedProducts.map((p) => p.id)));
                }
              }}
              className="text-[11px] font-medium text-charcoal hover:text-gold transition-colors"
            >
              {expandedIds.size === pagedProducts.length ? "Collapse All On Page" : "Expand All On Page"}
            </button>
          </div>
        )}
      </div>

      {/* Product List */}
      <div className="space-y-4">
        {pagedProducts.map((product) => {
          const prices = product.variants.map((v) => v.price_minor);
          const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
          const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
          const totalStock = product.variants.reduce((sum, v) => sum + (v.on_hand - v.reserved), 0);
          const hasLowStock = product.variants.some(
            (v) => v.on_hand - v.reserved <= v.low_stock_limit && v.is_available,
          );

          const isActioning = actioningId === product.id;
          const isExpanded = expandedIds.has(product.id);

          return (
            <article
              key={product.id}
              className={`border transition-all ${
                isExpanded
                  ? "border-charcoal/30 bg-white shadow-md"
                  : "border-charcoal/15 bg-white shadow-soft hover:border-charcoal/30"
              }`}
            >
              {/* Collapsed Header / Compact Summary (Always Visible) */}
              <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
                <div
                  onClick={() => toggleExpanded(product.id)}
                  className="flex flex-1 items-center gap-3.5 sm:gap-4 cursor-pointer select-none min-w-0"
                >
                  {/* Thumbnail (48px / 56px) */}
                  <div className="relative size-12 sm:size-14 shrink-0 overflow-hidden border border-charcoal/10 bg-ivory">
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

                  {/* Summary Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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

                      {product.collection && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-xs text-[0.6rem] font-bold uppercase tracking-wider ${
                            product.collection === "premium"
                              ? "bg-gold text-charcoal border border-amber-300"
                              : "bg-charcoal/10 text-charcoal border border-charcoal/20"
                          }`}
                        >
                          {product.collection === "premium" ? "✦ Premium" : "Regular"}
                        </span>
                      )}

                      <span className="hidden sm:inline text-[0.65rem] font-semibold tracking-wider text-gold uppercase truncate">
                        {product.brand_name || "Solure Scents"} · {product.concentration}
                      </span>
                    </div>

                    <h2 className="mt-1 font-display text-lg sm:text-xl text-charcoal truncate">
                      {product.name}
                    </h2>

                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{product.variants.length} {product.variants.length === 1 ? "format" : "formats"}</span>
                      <span>·</span>
                      <span className={hasLowStock ? "text-amber-700 font-semibold" : "text-emerald-700 font-medium"}>
                        {totalStock} units available
                      </span>
                      {hasLowStock && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[0.58rem] font-semibold text-amber-800 uppercase">
                          Low Stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expand / Collapse Control */}
                <button
                  type="button"
                  onClick={() => toggleExpanded(product.id)}
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? `Collapse ${product.name} details` : `Expand ${product.name} details`}
                  className={`flex min-h-10 min-w-10 sm:px-3.5 sm:py-2 items-center justify-center gap-1.5 border text-xs font-semibold uppercase tracking-wider transition ${
                    isExpanded
                      ? "border-gold bg-gold/10 text-charcoal"
                      : "border-charcoal/20 bg-white text-charcoal hover:border-gold hover:text-gold"
                  }`}
                >
                  <span className="hidden sm:inline">{isExpanded ? "Collapse" : "Details"}</span>
                  <ChevronDown
                    className={`size-4 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Collapsible Expanded Details View */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden border-t border-charcoal/10 bg-ivory/30 p-4 sm:p-6"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      {/* Full Metadata Info */}
                      <div className="space-y-2">
                        <p className="text-xs text-muted">
                          <strong className="text-charcoal font-semibold">Brand:</strong>{" "}
                          {product.brand_name || "Solure Scents"} ·{" "}
                          <strong className="text-charcoal font-semibold">Concentration:</strong>{" "}
                          {product.concentration.toUpperCase()}
                        </p>

                        {product.subtitle && (
                          <p className="text-xs text-muted leading-relaxed">
                            <strong className="text-charcoal font-semibold">Subtitle:</strong>{" "}
                            {product.subtitle}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                          <div>
                            <span className="text-muted">Price Range: </span>
                            <span className="font-semibold text-charcoal">
                              {minPrice === maxPrice
                                ? formatMoney(minPrice, "NGN")
                                : `${formatMoney(minPrice, "NGN")} – ${formatMoney(maxPrice, "NGN")}`}
                            </span>
                          </div>

                          <span className="text-charcoal/20">|</span>

                          <div>
                            <span className="text-muted">Total Stock Units: </span>
                            <span className="font-bold text-emerald-800">{totalStock} units</span>
                          </div>
                        </div>
                      </div>

                      {/* Management Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {product.status === "active" ? (
                          <Link
                            href={`/shop/${product.slug}`}
                            target="_blank"
                            className="inline-flex min-h-10 items-center gap-1.5 border border-charcoal/20 bg-white px-3.5 text-xs font-semibold tracking-wider text-charcoal uppercase transition hover:border-gold hover:text-gold"
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
                            className={`inline-flex min-h-10 items-center gap-1.5 border px-3.5 text-xs font-semibold tracking-wider uppercase transition ${
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
                          className="inline-flex min-h-10 items-center gap-1.5 bg-charcoal px-4 text-xs font-semibold tracking-wider text-pearl uppercase transition hover:bg-gold hover:text-charcoal"
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
                            className="inline-flex min-h-10 items-center gap-1 border border-charcoal/10 bg-white px-3 text-xs font-semibold tracking-wider text-muted uppercase transition hover:border-rose-300 hover:text-rose-700"
                            title="Archive fragrance (soft delete)"
                          >
                            <Archive size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Variants and Stock Table */}
                    <div className="mt-5 border-t border-charcoal/10 pt-4">
                      <p className="text-[0.66rem] font-semibold tracking-[0.16em] text-muted uppercase">
                        Available Formats & Stock Allocations ({product.variants.length})
                      </p>

                      {product.variants.length > 0 ? (
                        <div className="mt-2.5 overflow-x-auto">
                          <table className="w-full text-left text-xs min-w-[550px]">
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
                                  <tr key={v.id} className="hover:bg-white/80">
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
                  </motion.div>
                )}
              </AnimatePresence>
            </article>
          );
        })}

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="border-2 border-dashed border-charcoal/20 bg-white p-12 text-center shadow-soft">
            <Package size={40} className="mx-auto text-gold mb-3" />
            <h3 className="font-display text-2xl text-charcoal">
              {products.length === 0 ? "No perfumes in catalogue yet" : "No perfumes match your search"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-muted">
              {products.length === 0
                ? "Start building your luxury fragrance catalogue. Add your first flacon with photos, olfactory notes, and bottle sizes in seconds."
                : "Try adjusting your search terms or clearing the status filter to find what you're looking for."}
            </p>
            {products.length === 0 ? (
              <div className="mt-6">
                <Link
                  href="/admin/products/new"
                  className="inline-flex min-h-11 items-center gap-2 bg-charcoal px-6 text-xs font-semibold tracking-[0.16em] text-pearl uppercase transition hover:bg-gold hover:text-charcoal shadow-md"
                >
                  <Plus size={16} />
                  <span>Create Your First Fragrance</span>
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <nav
        aria-label="Admin products pagination"
        className="flex flex-col gap-4 border-t border-charcoal/10 pt-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <p>
            Showing{" "}
            <strong className="text-charcoal font-semibold">
              {filteredProducts.length > 0 ? (validPage - 1) * pageSize + 1 : 0}–
              {Math.min(validPage * pageSize, filteredProducts.length)}
            </strong>{" "}
            of <strong className="text-charcoal font-semibold">{filteredProducts.length}</strong> fragrances
          </p>

          {filteredProducts.length > 10 && (
            <div className="flex items-center gap-1.5 border-l border-charcoal/15 pl-3">
              <span className="text-[11px] text-muted">Per page:</span>
              <div className="inline-flex rounded border border-charcoal/15 bg-white p-0.5 shadow-xs">
                {[10, 20, 50].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => {
                      setPageSize(sz);
                      setCurrentPage(1);
                    }}
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold transition ${
                      pageSize === sz
                        ? "bg-charcoal text-pearl font-bold shadow-xs"
                        : "text-charcoal/70 hover:bg-ivory hover:text-gold"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={validPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex min-h-9 items-center justify-center border border-charcoal/20 bg-white px-3 text-xs font-semibold uppercase tracking-wider text-charcoal transition hover:border-gold hover:text-gold disabled:opacity-40 disabled:pointer-events-none"
            >
              ← Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`flex size-9 items-center justify-center border text-xs font-semibold transition ${
                    pageNum === validPage
                      ? "border-charcoal bg-charcoal text-pearl font-bold shadow-xs"
                      : "border-charcoal/15 bg-white text-charcoal hover:border-gold hover:text-gold"
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex min-h-9 items-center justify-center border border-charcoal/20 bg-white px-3 text-xs font-semibold uppercase tracking-wider text-charcoal transition hover:border-gold hover:text-gold disabled:opacity-40 disabled:pointer-events-none"
            >
              Next →
            </button>
          </div>
        )}
      </nav>

    </div>
  );
}
