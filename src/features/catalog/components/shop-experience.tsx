"use client";

import { Search } from "lucide-react";
import Link from "next/link";

import { ProductCard } from "@/components/store/product-card";
import type {
  CatalogFacetOption,
  CatalogFacets,
  PaginatedProducts,
} from "@/features/catalog/services/catalog-service";

export interface ShopFilterState {
  brandId?: string;
  collectionId?: string;
  concentration?: string;
  familyId?: string;
  query?: string;
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
  { value: "extrait", label: "Extrait" },
  { value: "oil", label: "Perfume Oil" },
] as const;

export function ShopExperience({ facets, filters, result }: ShopExperienceProps) {
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <main className="min-h-screen bg-pearl">
      {/* Clean Luxury Catalogue Section */}
      <section className="mx-auto max-w-[90rem] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        {/* Section Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-charcoal/10 pb-8 sm:flex-row sm:items-end">
          <div>
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
          <p className="max-w-md text-xs sm:text-sm leading-relaxed text-muted sm:text-right">
            Handcrafted and curated compositions, formulated with high-grade perfume oils for enduring presence.
          </p>
        </div>

        {/* Quick Category Filter Pills */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {[
            {
              label: "All Compositions",
              href: "/shop",
              active: !filters.query && !filters.concentration,
            },
            {
              label: "Unisex Fragrances",
              href: "/shop?q=unisex",
              active: filters.query === "unisex",
            },
            {
              label: "Pour Homme",
              href: "/shop?q=men",
              active: filters.query === "men",
            },
            {
              label: "Pour Femme",
              href: "/shop?q=women",
              active: filters.query === "women",
            },
            {
              label: "Extrait de Parfum",
              href: "/shop?concentration=extrait",
              active: filters.concentration === "extrait",
            },
            {
              label: "Eau de Parfum",
              href: "/shop?concentration=edp",
              active: filters.concentration === "edp",
            },
          ].map((pill) => (
            <Link
              key={pill.label}
              href={pill.href}
              className={`px-4 py-2 text-[11px] font-semibold tracking-wider uppercase transition-all ${
                pill.active
                  ? "bg-charcoal text-pearl border border-charcoal shadow-sm"
                  : "bg-white border border-charcoal/15 text-charcoal hover:border-gold hover:text-gold"
              }`}
            >
              {pill.label}
            </Link>
          ))}
        </div>

        {/* Detailed Filter & Search Form */}
        <form
          action="/shop"
          className="sticky top-20 z-20 mt-6 border border-charcoal/15 bg-pearl/95 p-4 shadow-[0_12px_36px_rgba(29,27,25,0.06)] backdrop-blur-xl"
          method="get"
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(15rem,1.4fr)_repeat(4,minmax(8rem,1fr))_auto]">
            <label className="relative block">
              <span className="sr-only">Search fragrances</span>
              <Search
                aria-hidden="true"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                size={16}
                strokeWidth={1.5}
              />
              <input
                className="h-12 w-full border border-charcoal/20 bg-white pl-11 pr-4 text-sm text-charcoal outline-none transition-colors placeholder:text-muted/65 focus:border-gold"
                defaultValue={filters.query ?? ""}
                name="q"
                placeholder="Search by perfume name or notes..."
                type="search"
              />
            </label>
            <FacetSelect
              label="All brands"
              name="brand"
              options={facets.brands}
              value={filters.brandId}
            />
            <FacetSelect
              label="All families"
              name="family"
              options={facets.families}
              value={filters.familyId}
            />
            <label>
              <span className="sr-only">Concentration</span>
              <select
                className="h-12 w-full border border-charcoal/20 bg-white px-3 text-xs text-charcoal outline-none transition-colors focus:border-gold"
                defaultValue={filters.concentration ?? ""}
                name="concentration"
              >
                <option value="">All concentrations</option>
                {concentrations.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <FacetSelect
              label="All collections"
              name="collection"
              options={facets.collections}
              value={filters.collectionId}
            />
            <button
              className="h-12 bg-charcoal px-7 text-[0.66rem] font-semibold tracking-[0.18em] text-pearl uppercase transition-colors hover:bg-gold hover:text-charcoal"
              type="submit"
            >
              Filter
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-charcoal/10 pt-4 text-xs text-muted">
            <p>
              <strong className="text-charcoal font-semibold">{result.total}</strong>{" "}
              {result.total === 1 ? "fragrance" : "fragrances"} available
            </p>
            <div className="flex items-center gap-4">
              {activeFilterCount ? (
                <span>
                  {activeFilterCount} active {activeFilterCount === 1 ? "filter" : "filters"}
                </span>
              ) : (
                <span>Showing complete collection</span>
              )}
              {activeFilterCount ? (
                <Link
                  className="font-semibold text-charcoal underline decoration-gold underline-offset-4 hover:text-gold"
                  href="/shop"
                >
                  Clear all filters
                </Link>
              ) : null}
            </div>
          </div>
        </form>

        {/* Clean Product Grid (Only Actual Products) */}
        {result.items.length > 0 ? (
          <>
            <div className="grid gap-x-6 gap-y-12 py-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {result.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <Pagination filters={filters} result={result} />
          </>
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

function FacetSelect({
  label,
  name,
  options,
  value,
}: {
  label: string;
  name: string;
  options: CatalogFacetOption[];
  value?: string;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        className="h-12 w-full border border-charcoal/20 bg-white px-3 text-xs text-charcoal outline-none transition-colors focus:border-gold"
        defaultValue={value ?? ""}
        name={name}
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function PremiumEmptyState({ filtered }: { filtered: boolean }) {
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
            ? "Try clearing filters or exploring our complete perfume collection."
            : "Every bottle enters the Solure wardrobe slowly—reviewed for character, craft, and the feeling it leaves behind."}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {filtered ? (
            <Link
              className="inline-flex min-h-12 items-center justify-center bg-champagne px-6 text-[0.62rem] font-semibold tracking-[0.16em] text-charcoal uppercase"
              href="/shop"
            >
              Clear filters
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

  const hrefForPage = (page: number) => {
    const params = new URLSearchParams();
    if (filters.query) params.set("q", filters.query);
    if (filters.brandId) params.set("brand", filters.brandId);
    if (filters.familyId) params.set("family", filters.familyId);
    if (filters.concentration) params.set("concentration", filters.concentration);
    if (filters.collectionId) params.set("collection", filters.collectionId);
    params.set("page", String(page));
    return `/shop?${params.toString()}`;
  };

  return (
    <nav
      aria-label="Catalogue pagination"
      className="flex items-center justify-between border-t border-charcoal/10 py-8 text-xs"
    >
      {result.page > 1 ? (
        <Link
          className="font-semibold uppercase tracking-wider text-charcoal hover:text-gold"
          href={hrefForPage(result.page - 1)}
        >
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted">
        Page {result.page} of {totalPages}
      </span>
      {result.page < totalPages ? (
        <Link
          className="font-semibold uppercase tracking-wider text-charcoal hover:text-gold"
          href={hrefForPage(result.page + 1)}
        >
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
