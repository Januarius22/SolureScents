"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Crown,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { ProductCard } from "@/components/store/product-card";
import type {
  CatalogFacets,
  PaginatedProducts,
} from "@/features/catalog/services/catalog-service";

export interface ShopFilterState {
  brandId?: string;
  category?: "unisex" | "men" | "women";
  collection?: "premium" | "regular";
  collectionId?: string;
  concentration?: string;
  familyId?: string;
  limit?: number;
  maxPrice?: number;
  minPrice?: number;
  query?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "name_asc";
}

interface ShopExperienceProps {
  facets: CatalogFacets;
  filters: ShopFilterState;
  result: PaginatedProducts;
}

const concentrations = [
  { value: "edc", label: "Eau de Cologne" },
  { value: "edt", label: "Eau de Toilette" },
  { value: "edp", label: "Eau de Parfum" },
  { value: "parfum", label: "Parfum" },
  { value: "extrait", label: "Extrait de Parfum" },
  { value: "oil", label: "Perfume Oil" },
] as const;

export function ShopExperience({ facets, filters, result }: ShopExperienceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Collapsed by default requirement
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Local state for the filter panel fields
  const [selectedCollection, setSelectedCollection] = useState<string>(
    filters.collection || ""
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    filters.category || ""
  );
  const [selectedBrand, setSelectedBrand] = useState<string>(
    filters.brandId || ""
  );
  const [selectedConcentration, setSelectedConcentration] = useState<string>(
    filters.concentration || ""
  );
  const [selectedSort, setSelectedSort] = useState<string>(
    filters.sort || "newest"
  );
  const [minPrice, setMinPrice] = useState<string>(
    filters.minPrice !== undefined ? String(filters.minPrice) : ""
  );
  const [maxPrice, setMaxPrice] = useState<string>(
    filters.maxPrice !== undefined ? String(filters.maxPrice) : ""
  );

  // Active filter count
  const activeFilterCount = [
    filters.collection,
    filters.category,
    filters.brandId,
    filters.concentration,
    filters.familyId,
    filters.minPrice,
    filters.maxPrice,
    filters.query,
    filters.sort && filters.sort !== "newest" ? filters.sort : undefined,
  ].filter(Boolean).length;

  // Helper to build URL with changed param
  const buildShopUrl = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page"); // reset pagination on filter change
    Object.entries(overrides).forEach(([key, val]) => {
      if (val === undefined || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    const queryString = params.toString();
    return queryString ? `/shop?${queryString}` : "/shop";
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const url = buildShopUrl({
      collection: selectedCollection || undefined,
      category: selectedCategory || undefined,
      brand: selectedBrand || undefined,
      concentration: selectedConcentration || undefined,
      sort: selectedSort !== "newest" ? selectedSort : undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
    });
    router.push(url);
    setIsFilterPanelOpen(false);
  };

  const handleClearAll = () => {
    setSelectedCollection("");
    setSelectedCategory("");
    setSelectedBrand("");
    setSelectedConcentration("");
    setSelectedSort("newest");
    setMinPrice("");
    setMaxPrice("");
    router.push("/shop");
    setIsFilterPanelOpen(false);
  };

  return (
    <main className="min-h-screen bg-pearl">
      <section className="mx-auto max-w-[90rem] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        {/* Header */}
        <div className="border-b border-charcoal/10 pb-6">
          <div className="flex items-center gap-2">
            <span className="h-px w-6 bg-gold" />
            <p className="text-[0.66rem] font-semibold tracking-[0.24em] text-gold uppercase">
              The Solure Wardrobe
            </p>
          </div>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl lg:text-6xl text-charcoal tracking-tight">
            The Fragrance Collection
          </h1>
        </div>

        {/* Unified Collection Bar & Quick Category Pills */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-charcoal/10 pb-6">
          {/* Collection Pills (Unified Shop Requirement) */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={buildShopUrl({ collection: undefined })}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold tracking-wider uppercase transition-all ${
                !filters.collection
                  ? "bg-charcoal text-pearl border border-charcoal shadow-sm"
                  : "bg-white border border-charcoal/15 text-charcoal hover:border-gold hover:text-gold"
              }`}
            >
              All Perfumes
            </Link>
            <Link
              href={buildShopUrl({ collection: "premium" })}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold tracking-wider uppercase transition-all ${
                filters.collection === "premium"
                  ? "bg-gold text-charcoal border border-gold shadow-sm font-bold"
                  : "bg-white border border-gold/40 text-charcoal hover:border-gold hover:bg-gold/10"
              }`}
            >
              <Crown className="size-3.5 text-gold fill-gold/20" />
              <span>Premium Collection</span>
            </Link>
            <Link
              href={buildShopUrl({ collection: "regular" })}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold tracking-wider uppercase transition-all ${
                filters.collection === "regular"
                  ? "bg-charcoal text-pearl border border-charcoal shadow-sm"
                  : "bg-white border border-charcoal/15 text-charcoal hover:border-charcoal/40"
              }`}
            >
              <Sparkles className="size-3.5 text-muted" />
              <span>Regular Collection</span>
            </Link>
          </div>

          {/* Controls: Filter & Sort Toggle and Quick Sort */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen((prev) => !prev)}
              aria-expanded={isFilterPanelOpen}
              className={`inline-flex items-center gap-2 border px-4 py-2.5 text-xs font-semibold tracking-wider uppercase transition-all ${
                isFilterPanelOpen || activeFilterCount > 0
                  ? "border-charcoal bg-charcoal text-pearl"
                  : "border-charcoal/20 bg-white text-charcoal hover:border-gold hover:text-gold"
              }`}
            >
              <SlidersHorizontal className="size-3.5" />
              <span>Filter & Sort</span>
              {activeFilterCount > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-charcoal">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown
                className={`size-3.5 transition-transform duration-200 ${
                  isFilterPanelOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Collapsible Filter Panel (Smooth Framer Motion Animation) */}
        <AnimatePresence>
          {isFilterPanelOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden border-b border-charcoal/15 bg-white/70 backdrop-blur-md"
            >
              <form onSubmit={handleApplyFilters} className="p-6 sm:p-8">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {/* 1. Collection Selector */}
                  <div>
                    <label className="text-[0.66rem] font-semibold tracking-[0.2em] text-muted uppercase">
                      Perfume Collection
                    </label>
                    <div className="mt-2.5 flex flex-col gap-2">
                      {[
                        { label: "All Fragrances", value: "" },
                        { label: "Premium Collection", value: "premium" },
                        { label: "Regular Collection", value: "regular" },
                      ].map((item) => (
                        <label
                          key={item.value}
                          className={`flex cursor-pointer items-center justify-between border px-3 py-2 text-xs transition-colors ${
                            selectedCollection === item.value
                              ? "border-gold bg-gold/10 font-medium text-charcoal"
                              : "border-charcoal/10 bg-white text-charcoal/80 hover:border-charcoal/30"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {item.value === "premium" && (
                              <Crown className="size-3 text-gold" />
                            )}
                            {item.label}
                          </span>
                          <input
                            type="radio"
                            name="collection"
                            value={item.value}
                            checked={selectedCollection === item.value}
                            onChange={() => setSelectedCollection(item.value)}
                            className="accent-gold"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 2. Gender / Category */}
                  <div>
                    <label className="text-[0.66rem] font-semibold tracking-[0.2em] text-muted uppercase">
                      Gender / Category
                    </label>
                    <div className="mt-2.5 flex flex-col gap-2">
                      {[
                        { label: "All Compositions", value: "" },
                        { label: "Unisex Fragrances", value: "unisex" },
                        { label: "Pour Homme (Men)", value: "men" },
                        { label: "Pour Femme (Women)", value: "women" },
                      ].map((cat) => (
                        <label
                          key={cat.value}
                          className={`flex cursor-pointer items-center justify-between border px-3 py-2 text-xs transition-colors ${
                            selectedCategory === cat.value
                              ? "border-charcoal bg-charcoal/5 font-medium text-charcoal"
                              : "border-charcoal/10 bg-white text-charcoal/80 hover:border-charcoal/30"
                          }`}
                        >
                          <span>{cat.label}</span>
                          <input
                            type="radio"
                            name="category"
                            value={cat.value}
                            checked={selectedCategory === cat.value}
                            onChange={() => setSelectedCategory(cat.value)}
                            className="accent-charcoal"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 3. Brand & Concentration */}
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="shop-brand-select"
                        className="text-[0.66rem] font-semibold tracking-[0.2em] text-muted uppercase"
                      >
                        Brand
                      </label>
                      <select
                        id="shop-brand-select"
                        value={selectedBrand}
                        onChange={(e) => setSelectedBrand(e.target.value)}
                        className="mt-2.5 h-10 w-full border border-charcoal/20 bg-white px-3 text-xs text-charcoal outline-none transition-colors focus:border-gold"
                      >
                        <option value="">All Brands</option>
                        {facets.brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="shop-concentration-select"
                        className="text-[0.66rem] font-semibold tracking-[0.2em] text-muted uppercase"
                      >
                        Concentration
                      </label>
                      <select
                        id="shop-concentration-select"
                        value={selectedConcentration}
                        onChange={(e) => setSelectedConcentration(e.target.value)}
                        className="mt-2.5 h-10 w-full border border-charcoal/20 bg-white px-3 text-xs text-charcoal outline-none transition-colors focus:border-gold"
                      >
                        <option value="">All Concentrations</option>
                        {concentrations.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 4. Price & Sorting */}
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="shop-sort-select"
                        className="text-[0.66rem] font-semibold tracking-[0.2em] text-muted uppercase"
                      >
                        Sort By
                      </label>
                      <select
                        id="shop-sort-select"
                        value={selectedSort}
                        onChange={(e) => setSelectedSort(e.target.value)}
                        className="mt-2.5 h-10 w-full border border-charcoal/20 bg-white px-3 text-xs text-charcoal outline-none transition-colors focus:border-gold"
                      >
                        <option value="newest">Newest Arrivals</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                        <option value="name_asc">Fragrance Name (A–Z)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[0.66rem] font-semibold tracking-[0.2em] text-muted uppercase">
                        Price Range (₦)
                      </label>
                      <div className="mt-2.5 grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Min ₦"
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value)}
                          className="h-10 border border-charcoal/20 bg-white px-3 text-xs text-charcoal outline-none transition-colors focus:border-gold"
                        />
                        <input
                          type="number"
                          placeholder="Max ₦"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                          className="h-10 border border-charcoal/20 bg-white px-3 text-xs text-charcoal outline-none transition-colors focus:border-gold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-charcoal/10 pt-5">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal hover:text-gold uppercase tracking-wider"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Clear All Filters</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsFilterPanelOpen(false)}
                      className="border border-charcoal/20 bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-charcoal hover:border-charcoal/40"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="bg-charcoal px-7 py-2.5 text-xs font-semibold uppercase tracking-widest text-pearl transition-colors hover:bg-gold hover:text-charcoal"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Filters Summary Bar */}
        {(() => {
          const fromIndex = result.total > 0 ? (result.page - 1) * result.pageSize + 1 : 0;
          const toIndex = Math.min(result.page * result.pageSize, result.total);
          return (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
              <p>
                {result.total > result.pageSize ? (
                  <>
                    Showing{" "}
                    <strong className="text-charcoal font-semibold">
                      {fromIndex}–{toIndex}
                    </strong>{" "}
                    of <strong className="text-charcoal font-semibold">{result.total}</strong> fragrances
                  </>
                ) : (
                  <>
                    Showing <strong className="text-charcoal font-semibold">{result.total}</strong>{" "}
                    {result.total === 1 ? "fragrance" : "fragrances"}
                  </>
                )}
              </p>

              {activeFilterCount > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-medium text-charcoal">Active:</span>

                  {filters.collection && (
                    <span className="inline-flex items-center gap-1 bg-white border border-gold/30 px-2.5 py-1 text-[11px] text-charcoal">
                      {filters.collection === "premium" ? "✦ Premium" : "Regular"}
                      <Link
                        href={buildShopUrl({ collection: undefined })}
                        className="ml-1 text-muted hover:text-charcoal"
                      >
                        <X className="size-3" />
                      </Link>
                    </span>
                  )}

                  {filters.category && (
                    <span className="inline-flex items-center gap-1 bg-white border border-charcoal/15 px-2.5 py-1 text-[11px] text-charcoal capitalize">
                      {filters.category}
                      <Link
                        href={buildShopUrl({ category: undefined })}
                        className="ml-1 text-muted hover:text-charcoal"
                      >
                        <X className="size-3" />
                      </Link>
                    </span>
                  )}

                  {filters.brandId && (
                    <span className="inline-flex items-center gap-1 bg-white border border-charcoal/15 px-2.5 py-1 text-[11px] text-charcoal">
                      {facets.brands.find((b) => b.id === filters.brandId)?.name || "Brand"}
                      <Link
                        href={buildShopUrl({ brand: undefined })}
                        className="ml-1 text-muted hover:text-charcoal"
                      >
                        <X className="size-3" />
                      </Link>
                    </span>
                  )}

                  {filters.concentration && (
                    <span className="inline-flex items-center gap-1 bg-white border border-charcoal/15 px-2.5 py-1 text-[11px] text-charcoal uppercase">
                      {filters.concentration}
                      <Link
                        href={buildShopUrl({ concentration: undefined })}
                        className="ml-1 text-muted hover:text-charcoal"
                      >
                        <X className="size-3" />
                      </Link>
                    </span>
                  )}

                  {(filters.minPrice || filters.maxPrice) && (
                    <span className="inline-flex items-center gap-1 bg-white border border-charcoal/15 px-2.5 py-1 text-[11px] text-charcoal">
                      {filters.minPrice ? `₦${filters.minPrice.toLocaleString()}` : "₦0"} –{" "}
                      {filters.maxPrice ? `₦${filters.maxPrice.toLocaleString()}` : "Any"}
                      <Link
                        href={buildShopUrl({ minPrice: undefined, maxPrice: undefined })}
                        className="ml-1 text-muted hover:text-charcoal"
                      >
                        <X className="size-3" />
                      </Link>
                    </span>
                  )}

                  {filters.query && (
                    <span className="inline-flex items-center gap-1 bg-white border border-charcoal/15 px-2.5 py-1 text-[11px] text-charcoal">
                      &ldquo;{filters.query}&rdquo;
                      <Link
                        href={buildShopUrl({ q: undefined })}
                        className="ml-1 text-muted hover:text-charcoal"
                      >
                        <X className="size-3" />
                      </Link>
                    </span>
                  )}

                  <Link
                    href="/shop"
                    className="ml-2 font-semibold text-charcoal underline decoration-gold underline-offset-4 hover:text-gold"
                  >
                    Clear all
                  </Link>
                </div>
              )}
            </div>
          );
        })()}

        {/* Product Grid or Luxury Empty State */}
        {result.items.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8 py-6 sm:py-10 md:grid-cols-3 lg:grid-cols-4">
              {result.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <Pagination filters={filters} result={result} />
          </>
        ) : result.total > 0 ? (
          <div className="my-12 border border-charcoal/15 bg-white p-8 text-center sm:p-12">
            <p className="text-xs font-semibold tracking-wider text-gold uppercase">Catalogue Page Out of Range</p>
            <h3 className="mt-2 font-display text-2xl text-charcoal sm:text-3xl">Page does not contain fragrances</h3>
            <p className="mt-2 text-xs text-muted max-w-md mx-auto">
              Page {result.page} exceeds available pages for this search or filter.
            </p>
            <div className="mt-6">
              <Link
                href={buildShopUrl({ page: undefined })}
                className="inline-flex min-h-11 items-center justify-center bg-charcoal px-6 text-xs font-semibold tracking-wider text-pearl uppercase transition-colors hover:bg-gold hover:text-charcoal"
              >
                Return to Page 1
              </Link>
            </div>
          </div>
        ) : (
          <PremiumEmptyState filtered={activeFilterCount > 0} />
        )}
      </section>

      {/* Scent Finder Consultation Banner */}
      <section className="bg-charcoal text-pearl">
        <div className="mx-auto grid max-w-[90rem] gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.2fr_1fr] md:items-center lg:px-12">
          <div>
            <p className="text-[0.64rem] tracking-[0.2em] text-champagne uppercase">
              Bespoke Guidance
            </p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl sm:text-5xl">
              Not sure which fragrance suits your aura?
            </h2>
          </div>
          <div className="md:text-right">
            <p className="max-w-lg text-sm leading-7 text-pearl/65 md:ml-auto">
              Our intuitive scent finder reveals compositions aligned with your character, occasion, and desired presence.
            </p>
            <Link
              className="mt-6 inline-flex min-h-12 items-center justify-center border border-champagne px-7 text-[0.64rem] font-semibold tracking-[0.18em] uppercase transition-colors hover:bg-champagne hover:text-charcoal"
              href="/discovery"
            >
              Begin the scent finder →
            </Link>
          </div>
        </div>
      </section>

      {/* Trust & Assurance Footer Strip */}
      <section className="border-b bg-ivory">
        <div className="mx-auto grid max-w-[90rem] divide-y px-5 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-12">
          {[
            "100% Authentic formulations",
            "Complimentary scent consultation",
            "Insured nationwide delivery",
          ].map((label, index) => (
            <div className="px-4 py-8 text-center" key={label}>
              <p className="text-[0.58rem] font-semibold tracking-[0.18em] text-gold">
                0{index + 1}
              </p>
              <p className="mt-2 font-display text-xl text-charcoal">{label}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function PremiumEmptyState({
  filtered,
}: {
  filtered: boolean;
}) {
  return (
    <div className="mt-12 grid overflow-hidden border border-charcoal/15 lg:grid-cols-[1.05fr_.95fr]">
      <div className="relative overflow-hidden bg-charcoal p-8 text-pearl sm:p-12">
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-20 size-64 rounded-full border border-champagne/20"
        />
        <div
          aria-hidden="true"
          className="absolute -right-4 top-24 size-32 rounded-full border border-champagne/15"
        />
        <p className="text-[0.64rem] tracking-[0.2em] text-champagne uppercase">
          {filtered ? "No matches found" : "The opening edit"}
        </p>
        <h3 className="mt-5 max-w-lg font-display text-4xl leading-[0.95] sm:text-5xl">
          {filtered
            ? "No fragrance matches your selection."
            : "Our fragrances are being prepared."}
        </h3>
        <p className="mt-6 max-w-lg text-sm leading-7 text-pearl/65">
          {filtered
            ? "Try resetting filters or adjusting your price and concentration criteria."
            : "Every bottle enters the Solure wardrobe slowly—reviewed for character, craft, and the feeling it leaves behind."}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {filtered ? (
            <Link
              className="inline-flex min-h-12 items-center justify-center bg-champagne px-6 text-[0.62rem] font-semibold tracking-[0.16em] text-charcoal uppercase"
              href="/shop"
            >
              Clear all filters
            </Link>
          ) : null}
          <Link
            className="inline-flex min-h-12 items-center justify-center border border-pearl/35 px-6 text-[0.62rem] font-semibold tracking-[0.16em] uppercase transition-colors hover:border-champagne hover:text-champagne"
            href="/discovery"
          >
            Find my scent
          </Link>
        </div>
      </div>
      <div className="bg-white p-8 sm:p-12">
        <p className="text-[0.64rem] tracking-[0.2em] text-gold uppercase">What defines the edit</p>
        <div className="mt-8 divide-y divide-charcoal/10">
          {[
            [
              "01",
              "Distinctive character",
              "A point of view that remains recognisable from first spray to drydown.",
            ],
            [
              "02",
              "Considered craft",
              "Composition, materials and performance examined as one complete experience.",
            ],
            [
              "03",
              "A lasting memory",
              "Fragrances selected for how naturally they become part of your story.",
            ],
          ].map(([index, title, copy]) => (
            <div className="grid grid-cols-[2rem_1fr] gap-4 py-5 first:pt-0" key={index}>
              <span className="text-[0.6rem] font-semibold text-gold">{index}</span>
              <div>
                <h4 className="font-display text-2xl text-charcoal">{title}</h4>
                <p className="mt-2 text-xs leading-5 text-muted">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Pagination({
  filters,
  result,
}: {
  filters: ShopFilterState;
  result: PaginatedProducts;
}) {
  const totalPages = Math.ceil(result.total / result.pageSize);
  if (totalPages <= 1) return null;

  const currentPage = Math.max(1, Math.min(result.page, totalPages));

  const hrefForPage = (page: number) => {
    const params = new URLSearchParams();
    if (filters.query) params.set("q", filters.query);
    if (filters.brandId) params.set("brand", filters.brandId);
    if (filters.category) params.set("category", filters.category);
    if (filters.collection) params.set("collection", filters.collection);
    if (filters.familyId) params.set("family", filters.familyId);
    if (filters.concentration) params.set("concentration", filters.concentration);
    if (filters.minPrice) params.set("minPrice", String(filters.minPrice));
    if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
    if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
    if (filters.limit) params.set("limit", String(filters.limit));
    if (page > 1) {
      params.set("page", String(page));
    }
    const qs = params.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      aria-label="Catalogue pagination"
      className="mt-10 border-t border-charcoal/10 pt-8"
    >
      {/* Desktop / Tablet Numbered Pagination */}
      <div className="hidden sm:flex items-center justify-between">
        {/* Previous Button */}
        {currentPage > 1 ? (
          <Link
            className="inline-flex min-h-10 items-center justify-center border border-charcoal/20 bg-white px-4 text-xs font-semibold uppercase tracking-wider text-charcoal transition-colors hover:border-gold hover:text-gold"
            href={hrefForPage(currentPage - 1)}
          >
            ← Previous
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex min-h-10 items-center justify-center border border-charcoal/10 bg-ivory/50 px-4 text-xs font-semibold uppercase tracking-wider text-muted/40 cursor-not-allowed select-none"
          >
            ← Previous
          </span>
        )}

        {/* Numbered Page List */}
        <div className="flex items-center gap-1.5">
          {pageNumbers.map((pageNum, idx) => {
            if (pageNum === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="flex size-10 items-center justify-center text-xs text-muted"
                >
                  …
                </span>
              );
            }
            const isActive = pageNum === currentPage;
            return (
              <Link
                key={pageNum}
                href={hrefForPage(pageNum)}
                aria-current={isActive ? "page" : undefined}
                className={`flex size-10 items-center justify-center border text-xs font-semibold transition-all ${
                  isActive
                    ? "border-charcoal bg-charcoal text-pearl shadow-xs font-bold"
                    : "border-charcoal/15 bg-white text-charcoal hover:border-gold hover:text-gold"
                }`}
              >
                {pageNum}
              </Link>
            );
          })}
        </div>

        {/* Next Button */}
        {currentPage < totalPages ? (
          <Link
            className="inline-flex min-h-10 items-center justify-center border border-charcoal/20 bg-white px-4 text-xs font-semibold uppercase tracking-wider text-charcoal transition-colors hover:border-gold hover:text-gold"
            href={hrefForPage(currentPage + 1)}
          >
            Next →
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex min-h-10 items-center justify-center border border-charcoal/10 bg-ivory/50 px-4 text-xs font-semibold uppercase tracking-wider text-muted/40 cursor-not-allowed select-none"
          >
            Next →
          </span>
        )}
      </div>

      {/* Mobile Compact Pagination */}
      <div className="flex sm:hidden items-center justify-between gap-2">
        {currentPage > 1 ? (
          <Link
            className="inline-flex min-h-10 flex-1 items-center justify-center border border-charcoal/20 bg-white px-3 text-xs font-semibold uppercase tracking-wider text-charcoal transition-colors hover:border-gold hover:text-gold"
            href={hrefForPage(currentPage - 1)}
          >
            ← Prev
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex min-h-10 flex-1 items-center justify-center border border-charcoal/10 bg-ivory/50 px-3 text-xs font-semibold uppercase tracking-wider text-muted/40 cursor-not-allowed select-none"
          >
            ← Prev
          </span>
        )}

        <div className="flex items-center justify-center px-4 py-2 text-xs font-medium text-charcoal bg-white border border-charcoal/15 shrink-0">
          <span className="font-bold text-gold mr-1">{currentPage}</span>
          <span className="text-muted">/ {totalPages}</span>
        </div>

        {currentPage < totalPages ? (
          <Link
            className="inline-flex min-h-10 flex-1 items-center justify-center border border-charcoal/20 bg-white px-3 text-xs font-semibold uppercase tracking-wider text-charcoal transition-colors hover:border-gold hover:text-gold"
            href={hrefForPage(currentPage + 1)}
          >
            Next →
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex min-h-10 flex-1 items-center justify-center border border-charcoal/10 bg-ivory/50 px-3 text-xs font-semibold uppercase tracking-wider text-muted/40 cursor-not-allowed select-none"
          >
            Next →
          </span>
        )}
      </div>
    </nav>
  );
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [];
  pages.push(1);
  if (currentPage > 3) {
    pages.push("...");
  }
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  if (currentPage < totalPages - 2) {
    pages.push("...");
  }
  pages.push(totalPages);
  return pages;
}
