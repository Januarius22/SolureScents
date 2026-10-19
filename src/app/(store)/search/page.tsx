import type { Metadata } from "next";
import { headers } from "next/headers";
import { ArrowRight, Crown, RotateCcw, Search as SearchIcon, Sparkles, X } from "lucide-react";
import Link from "next/link";

import { ProductCard } from "@/components/store/product-card";
import { listPublishedProducts } from "@/features/catalog/services/catalog-service";

export const metadata: Metadata = {
  title: "Search Fragrances | Solure Scents",
  description: "Search our curated collection of luxury perfumes, signature blends, and rare extraits.",
  robots: { index: false, follow: true },
};

const SUGGESTED_QUERIES = [
  "Khalifa",
  "Oud",
  "Vanilla",
  "Amber",
  "Citrus",
  "Extrait",
  "Woody",
  "Floral",
];

const readString = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const params = await searchParams;
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";
  const isMobile = /mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(userAgent);

  const rawQuery = readString(params.q)?.trim() || "";
  const rawCollection = readString(params.collection) as
    | "premium"
    | "regular"
    | undefined;

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

  const hasSearch = Boolean(rawQuery || rawCollection);

  const result = hasSearch
    ? await listPublishedProducts({
        query: rawQuery || undefined,
        collection: rawCollection || undefined,
        limit: activeLimit,
        page: activePage,
      })
    : null;

  const totalResults = result?.total ?? 0;
  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;
  const currentPage = result ? Math.max(1, Math.min(result.page, totalPages || 1)) : 1;

  const buildSearchUrl = (collectionValue?: "premium" | "regular", pageNumber?: number) => {
    const sp = new URLSearchParams();
    if (rawQuery) sp.set("q", rawQuery);
    if (collectionValue) sp.set("collection", collectionValue);
    if (rawLimit) sp.set("limit", String(activeLimit));
    if (pageNumber && pageNumber > 1) sp.set("page", String(pageNumber));
    const qs = sp.toString();
    return qs ? `/search?${qs}` : "/search";
  };

  const fromIndex = totalResults > 0 ? (currentPage - 1) * activeLimit + 1 : 0;
  const toIndex = Math.min(currentPage * activeLimit, totalResults);

  return (
    <main className="min-h-screen bg-pearl">
      {/* Search Header Banner */}
      <section className="border-b border-charcoal/10 bg-ivory/60 px-4 py-8 sm:px-8 sm:py-16 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2">
            <span className="h-px w-6 bg-gold" />
            <p className="text-[0.66rem] font-semibold tracking-[0.24em] text-gold uppercase">
              The Olfactory Search
            </p>
          </div>
          <h1 className="mt-2.5 font-display text-3xl sm:text-5xl lg:text-6xl text-charcoal tracking-tight">
            Discover Your Fragrance
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed max-w-2xl">
            Explore perfumes by fragrance name, house, aromatic notes, or collection tier.
          </p>

          {/* Luxury Search Form */}
          <form
            action="/search"
            method="get"
            className="mt-6 sm:mt-8 relative flex w-full max-w-full items-center border border-charcoal/30 bg-white shadow-[0_8px_30px_rgba(29,27,25,0.05)] transition-all focus-within:border-gold focus-within:shadow-[0_12px_36px_rgba(197,160,89,0.15)] overflow-hidden"
          >
            <label htmlFor="search-input" className="sr-only">
              Search fragrances by name, brand, or notes
            </label>
            <div className="pl-3 sm:pl-5 text-muted pointer-events-none shrink-0">
              <SearchIcon size={18} strokeWidth={1.5} />
            </div>
            <input
              id="search-input"
              name="q"
              type="search"
              defaultValue={rawQuery}
              placeholder="Search by name, brand, notes..."
              className="h-12 sm:h-16 min-w-0 flex-1 bg-transparent px-2.5 sm:px-4 text-xs sm:text-base text-charcoal outline-none placeholder:text-muted/60"
              autoComplete="off"
            />
            {rawCollection && (
              <input type="hidden" name="collection" value={rawCollection} />
            )}
            {rawQuery && (
              <Link
                href={rawCollection ? `/search?collection=${rawCollection}` : "/search"}
                aria-label="Clear search query"
                className="p-1.5 sm:p-2 text-muted hover:text-charcoal transition-colors shrink-0"
              >
                <X size={16} />
              </Link>
            )}
            <button
              type="submit"
              className="h-12 sm:h-16 bg-charcoal px-4 sm:px-8 text-[0.65rem] sm:text-xs font-semibold tracking-[0.14em] sm:tracking-[0.18em] text-pearl uppercase transition-colors hover:bg-gold hover:text-charcoal shrink-0"
            >
              Search
            </button>
          </form>

          {/* Quick Suggestions Chips */}
          <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
            <span className="text-[10px] sm:text-[11px] font-semibold text-muted tracking-wider uppercase mr-0.5">
              Suggested:
            </span>
            {SUGGESTED_QUERIES.map((term) => (
              <Link
                key={term}
                href={`/search?q=${encodeURIComponent(term)}${
                  rawCollection ? `&collection=${rawCollection}` : ""
                }`}
                className={`border px-2.5 py-1 text-[11px] sm:text-xs transition-colors ${
                  rawQuery.toLowerCase() === term.toLowerCase()
                    ? "border-gold bg-gold/15 text-charcoal font-medium"
                    : "border-charcoal/15 bg-white text-charcoal/75 hover:border-gold hover:text-gold"
                }`}
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Results or Empty State Container */}
      <section className="mx-auto max-w-[90rem] px-4 py-8 sm:px-8 sm:py-14 lg:px-12">
        {hasSearch ? (
          <div>
            {/* Filter by Collection Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-charcoal/10 pb-5">
              <div>
                <p className="text-xs text-muted">
                  {totalResults > activeLimit ? (
                    <>
                      Showing{" "}
                      <strong className="text-charcoal font-semibold">{fromIndex}–{toIndex}</strong>{" "}
                      of <strong className="text-charcoal font-semibold">{totalResults}</strong> results
                    </>
                  ) : (
                    <>
                      Showing{" "}
                      <strong className="text-charcoal font-semibold">{totalResults}</strong>{" "}
                      {totalResults === 1 ? "result" : "results"}
                    </>
                  )}
                  {rawQuery && (
                    <span>
                      {" "}
                      for &ldquo;<strong className="text-charcoal">{rawQuery}</strong>&rdquo;
                    </span>
                  )}
                </p>
              </div>

              {/* Collection Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted uppercase mr-1">
                  Collection:
                </span>
                <Link
                  href={buildSearchUrl(undefined)}
                  className={`px-3 py-1.5 text-xs font-semibold tracking-wider uppercase transition-all ${
                    !rawCollection
                      ? "bg-charcoal text-pearl border border-charcoal"
                      : "bg-white border border-charcoal/15 text-charcoal hover:border-gold hover:text-gold"
                  }`}
                >
                  All Perfumes
                </Link>
                <Link
                  href={buildSearchUrl("premium")}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold tracking-wider uppercase transition-all ${
                    rawCollection === "premium"
                      ? "bg-gold text-charcoal border border-gold font-bold shadow-sm"
                      : "bg-white border border-gold/40 text-charcoal hover:border-gold hover:bg-gold/10"
                  }`}
                >
                  <Crown className="size-3 text-gold" />
                  <span>Premium</span>
                </Link>
                <Link
                  href={buildSearchUrl("regular")}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold tracking-wider uppercase transition-all ${
                    rawCollection === "regular"
                      ? "bg-charcoal text-pearl border border-charcoal"
                      : "bg-white border border-charcoal/15 text-charcoal hover:border-charcoal/40"
                  }`}
                >
                  <Sparkles className="size-3 text-muted" />
                  <span>Regular</span>
                </Link>

                {(rawQuery || rawCollection) && (
                  <Link
                    href="/search"
                    className="ml-2 inline-flex items-center gap-1 text-xs text-muted hover:text-charcoal underline underline-offset-4"
                  >
                    <RotateCcw className="size-3" />
                    <span>Reset</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Results Grid or No Matches State */}
            {result && result.items.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8 py-6 sm:py-10 md:grid-cols-3 lg:grid-cols-4">
                  {result.items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Search Pagination */}
                {totalPages > 1 && (
                  <nav
                    aria-label="Search results pagination"
                    className="mt-8 border-t border-charcoal/10 pt-6"
                  >
                    {/* Desktop / Tablet Numbered Pagination */}
                    <div className="hidden sm:flex items-center justify-between">
                      {currentPage > 1 ? (
                        <Link
                          className="inline-flex min-h-10 items-center justify-center border border-charcoal/20 bg-white px-4 text-xs font-semibold uppercase tracking-wider text-charcoal transition-colors hover:border-gold hover:text-gold"
                          href={buildSearchUrl(rawCollection, currentPage - 1)}
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

                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                          const isActive = pageNum === currentPage;
                          return (
                            <Link
                              key={pageNum}
                              href={buildSearchUrl(rawCollection, pageNum)}
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

                      {currentPage < totalPages ? (
                        <Link
                          className="inline-flex min-h-10 items-center justify-center border border-charcoal/20 bg-white px-4 text-xs font-semibold uppercase tracking-wider text-charcoal transition-colors hover:border-gold hover:text-gold"
                          href={buildSearchUrl(rawCollection, currentPage + 1)}
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
                          href={buildSearchUrl(rawCollection, currentPage - 1)}
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
                          href={buildSearchUrl(rawCollection, currentPage + 1)}
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
                )}
              </>
            ) : (
              <div className="my-12 mx-auto max-w-2xl text-center py-10 px-5 border border-charcoal/15 bg-white">
                <div className="mx-auto flex size-12 sm:size-14 items-center justify-center rounded-full bg-pearl border border-charcoal/15 text-gold">
                  <SearchIcon size={22} strokeWidth={1.5} />
                </div>
                <h2 className="mt-4 font-display text-2xl sm:text-3xl text-charcoal">
                  No Fragrances Found
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed max-w-md mx-auto">
                  {rawQuery
                    ? `We could not find any perfumes matching "${rawQuery}". Please check your spelling or explore our complete catalog.`
                    : "No perfumes found for the selected collection filter."}
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/search"
                    className="border border-charcoal/30 bg-white px-5 py-2.5 text-xs font-semibold tracking-wider uppercase text-charcoal hover:border-gold hover:text-gold transition-colors"
                  >
                    Clear Search
                  </Link>
                  <Link
                    href="/shop"
                    className="bg-charcoal px-5 py-2.5 text-xs font-semibold tracking-wider uppercase text-pearl hover:bg-gold hover:text-charcoal transition-colors"
                  >
                    Browse All Fragrances
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty Search Initial Landing State */
          <div className="py-8">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Card 1: Premium Collection */}
              <div className="border border-charcoal/15 bg-white p-8 transition-all hover:border-gold/60 hover:shadow-md">
                <div className="flex items-center gap-2">
                  <Crown className="size-4 text-gold" />
                  <span className="text-[0.66rem] font-semibold tracking-[0.2em] text-gold uppercase">
                    Curated High Craft
                  </span>
                </div>
                <h3 className="mt-3 font-display text-2xl text-charcoal">
                  The Premium Collection
                </h3>
                <p className="mt-2 text-xs text-muted leading-relaxed">
                  High-concentration extraits and masterwork blends designed for deep projection and unforgettable presence.
                </p>
                <Link
                  href="/shop?collection=premium"
                  className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-charcoal hover:text-gold"
                >
                  <span>Explore Premium</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {/* Card 2: Regular Collection */}
              <div className="border border-charcoal/15 bg-white p-8 transition-all hover:border-charcoal/40 hover:shadow-md">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-muted" />
                  <span className="text-[0.66rem] font-semibold tracking-[0.2em] text-muted uppercase">
                    Daily Signatures
                  </span>
                </div>
                <h3 className="mt-3 font-display text-2xl text-charcoal">
                  The Regular Collection
                </h3>
                <p className="mt-2 text-xs text-muted leading-relaxed">
                  Versatile daily wear fragrances, clean eau de parfums, and timeless compositions for all occasions.
                </p>
                <Link
                  href="/shop?collection=regular"
                  className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-charcoal hover:text-gold"
                >
                  <span>Explore Regular</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {/* Card 3: Scent Finder */}
              <div className="border border-charcoal/15 bg-charcoal p-8 text-pearl transition-all hover:border-gold md:col-span-2 lg:col-span-1">
                <span className="text-[0.66rem] font-semibold tracking-[0.2em] text-champagne uppercase">
                  Personal Consultation
                </span>
                <h3 className="mt-3 font-display text-2xl text-pearl">
                  Scent Finder Quiz
                </h3>
                <p className="mt-2 text-xs text-pearl/65 leading-relaxed">
                  Answer 4 quick questions to discover your personalized olfactory profile and matching compositions.
                </p>
                <Link
                  href="/discovery"
                  className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-champagne hover:underline"
                >
                  <span>Start Scent Finder</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Complete Catalog CTA */}
            <div className="mt-12 text-center border-t border-charcoal/10 pt-10">
              <p className="text-sm text-muted">
                Looking for our complete catalogue of perfumes?
              </p>
              <Link
                href="/shop"
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-charcoal underline decoration-gold underline-offset-8 hover:text-gold"
              >
                <span>View Complete Fragrance Collection</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
