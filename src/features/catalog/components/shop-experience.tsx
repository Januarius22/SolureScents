"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Search } from "lucide-react";
import Image from "next/image";
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

const scentFamilies = [
  {
    character: "fresh",
    index: "01",
    title: "Fresh clarity",
    copy: "Citrus, aromatic herbs and translucent air.",
    tone: "from-[#e8eee8] to-[#f7f3e8]",
  },
  {
    character: "floral",
    index: "02",
    title: "Floral expression",
    copy: "Petals reimagined with softness and modern structure.",
    tone: "from-[#f2e4df] to-[#f8f1e9]",
  },
  {
    character: "woody",
    index: "03",
    title: "Woody depth",
    copy: "Polished woods, earth and an enduring quiet warmth.",
    tone: "from-[#dfd5c4] to-[#f2ece2]",
  },
  {
    character: "amber",
    index: "04",
    title: "Amber warmth",
    copy: "Resins, spice and an enveloping golden glow.",
    tone: "from-[#ead7b8] to-[#f5ead9]",
  },
] as const;

const ease = [0.22, 1, 0.36, 1] as const;

export function ShopExperience({ facets, filters, result }: ShopExperienceProps) {
  const reduceMotion = useReducedMotion();
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const reveal = reduceMotion
    ? {}
    : { initial: { y: 26 }, animate: { y: 0 } };

  return (
    <main className="overflow-hidden">
      <section className="relative grid min-h-[42rem] bg-ivory lg:grid-cols-1">
        <motion.div
          className="relative min-h-[22rem] overflow-hidden lg:col-start-1 lg:row-start-1 lg:min-h-[42rem]"
          initial={reduceMotion ? false : { scale: 1.04 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.25, ease }}
        >
          <Image
            alt="A curated wardrobe of sculptural fragrance bottles on warm travertine"
            className="object-cover object-[68%_center] lg:object-center"
            fill
            preload
            sizes="100vw"
            src="/images/solure-shop-hero.png"
          />
          <div aria-hidden="true" className="absolute inset-0 hidden bg-gradient-to-r from-ivory via-ivory/90 to-transparent lg:block" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-charcoal/25 via-transparent to-transparent lg:hidden" />
        </motion.div>

        <div className="relative z-10 flex items-center px-5 py-14 sm:px-8 lg:col-start-1 lg:row-start-1 lg:px-12 lg:py-20">
          <div className="mx-auto w-full max-w-[90rem]">
            <motion.div className="max-w-2xl" {...reveal} transition={{ duration: 0.85, delay: 0.2, ease }}>
              <div className="flex items-center gap-4">
                <span aria-hidden="true" className="h-px w-10 bg-gold" />
                <p className="text-[0.66rem] font-semibold tracking-[0.24em] text-gold uppercase">The fragrance wardrobe</p>
              </div>
              <h1 className="mt-7 font-display text-[clamp(4rem,7vw,7.5rem)] leading-[0.84] tracking-[-0.04em]">
                Compositions
                <span className="block font-normal text-gold italic">worth remembering.</span>
              </h1>
              <p className="mt-8 max-w-lg text-base leading-8 text-muted sm:text-lg">
                Rare character, thoughtful craft, and a presence that lingers. Discover the considered Solure edit.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a className="group inline-flex min-h-13 items-center justify-center gap-5 bg-charcoal px-7 text-[0.66rem] font-semibold tracking-[0.18em] text-white uppercase transition-colors hover:bg-gold" href="#catalogue">
                  Explore the edit
                  <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </a>
                <Link className="inline-flex min-h-13 items-center justify-center border border-charcoal/25 bg-pearl/70 px-7 text-[0.66rem] font-semibold tracking-[0.18em] uppercase backdrop-blur-sm transition-colors hover:border-gold hover:text-gold" href="/discovery">
                  Find your scent
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div
          className="absolute bottom-6 right-6 z-20 hidden border border-charcoal/20 bg-pearl/75 px-5 py-4 text-[0.6rem] tracking-[0.18em] uppercase backdrop-blur-md sm:block lg:bottom-8 lg:right-12"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.75, ease }}
        >
          Curated slowly · Worn instinctively
        </motion.div>
      </section>

      <section className="border-y bg-pearl">
        <div className="mx-auto grid max-w-[90rem] sm:grid-cols-2 xl:grid-cols-4">
          {scentFamilies.map((family) => (
            <div
              className="border-b sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0"
              key={family.character}
            >
              <Link className={`group relative block min-h-52 overflow-hidden bg-gradient-to-br ${family.tone} p-7 sm:p-8`} href={`/discovery?character=${family.character}#consultation`}>
                <div aria-hidden="true" className="absolute -bottom-16 -right-12 size-44 rounded-full border border-charcoal/10 transition-transform duration-700 group-hover:scale-110" />
                <div aria-hidden="true" className="absolute -bottom-6 right-6 h-32 w-16 border border-charcoal/15 bg-white/20 transition-transform duration-700 group-hover:-translate-y-2">
                  <span className="absolute -top-5 left-1/2 h-5 w-7 -translate-x-1/2 bg-charcoal/75" />
                </div>
                <p className="text-[0.6rem] font-semibold tracking-[0.18em] text-gold">{family.index} / 04</p>
                <h2 className="mt-8 max-w-48 font-display text-3xl">{family.title}</h2>
                <p className="mt-3 max-w-52 text-xs leading-5 text-muted">{family.copy}</p>
                <span className="mt-5 inline-block text-[0.6rem] font-semibold tracking-[0.15em] uppercase transition-colors group-hover:text-gold">Discover your match →</span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="scroll-mt-40" id="catalogue">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-[0.66rem] font-semibold tracking-[0.22em] text-gold uppercase">The Solure edit</p>
              <h2 className="mt-3 font-display text-5xl sm:text-6xl">Explore the collection.</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted sm:text-right">
              Every fragrance is selected for distinction, wearability, and the memory it leaves behind.
            </p>
          </div>

          <form action="/shop#catalogue" className="sticky top-[7rem] z-30 mt-10 border border-charcoal/15 bg-pearl/95 p-4 shadow-[0_15px_45px_rgba(29,27,25,0.07)] backdrop-blur-xl" method="get">
            <div className="grid gap-3 lg:grid-cols-[minmax(15rem,1.4fr)_repeat(4,minmax(8rem,1fr))_auto]">
              <label className="relative block">
                <span className="sr-only">Search fragrances</span>
                <Search aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} strokeWidth={1.5} />
                <input className="h-12 w-full border bg-white pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-muted/65 focus:border-gold" defaultValue={filters.query ?? ""} name="q" placeholder="Search the collection" type="search" />
              </label>
              <FacetSelect label="All brands" name="brand" options={facets.brands} value={filters.brandId} />
              <FacetSelect label="All families" name="family" options={facets.families} value={filters.familyId} />
              <label>
                <span className="sr-only">Concentration</span>
                <select className="h-12 w-full border bg-white px-3 text-xs text-charcoal outline-none transition-colors focus:border-gold" defaultValue={filters.concentration ?? ""} name="concentration">
                  <option value="">All concentrations</option>
                  {concentrations.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <FacetSelect label="All collections" name="collection" options={facets.collections} value={filters.collectionId} />
              <button className="h-12 bg-charcoal px-6 text-[0.64rem] font-semibold tracking-[0.16em] text-white uppercase transition-colors hover:bg-gold" type="submit">Apply</button>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted">
              <p><strong className="text-charcoal">{result.total}</strong> {result.total === 1 ? "composition" : "compositions"} in this edit</p>
              <div className="flex items-center gap-4">
                {activeFilterCount ? <span>{activeFilterCount} active {activeFilterCount === 1 ? "filter" : "filters"}</span> : <span>Showing the complete edit</span>}
                {activeFilterCount ? <Link className="font-semibold text-charcoal underline decoration-gold underline-offset-4 hover:text-gold" href="/shop#catalogue">Clear all</Link> : null}
              </div>
            </div>
          </form>

          {result.items.length ? (
            <>
              <motion.div
                animate="show"
                className="grid gap-x-6 gap-y-14 py-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                initial={reduceMotion ? false : "hidden"}
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: reduceMotion ? 0 : 0.06 } },
                }}
              >
                {result.items.map((product) => (
                  <motion.div
                    key={product.id}
                    variants={{
                      hidden: { y: 24 },
                      show: { y: 0, transition: { duration: 0.6, ease } },
                    }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </motion.div>
              <Pagination filters={filters} result={result} />
            </>
          ) : (
            <PremiumEmptyState filtered={activeFilterCount > 0} />
          )}
        </div>
      </section>

      <section className="bg-charcoal text-pearl">
        <div className="mx-auto grid max-w-[90rem] gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.2fr_1fr] md:items-center lg:px-12">
          <div>
            <p className="text-[0.64rem] tracking-[0.2em] text-champagne uppercase">A more personal beginning</p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl sm:text-5xl">Not sure where your story begins?</h2>
          </div>
          <div className="md:text-right">
            <p className="max-w-lg text-sm leading-7 text-pearl/65 md:ml-auto">Three intuitive choices reveal fragrances aligned with your character, occasion, and desired presence.</p>
            <Link className="mt-6 inline-flex min-h-12 items-center justify-center border border-champagne px-7 text-[0.64rem] font-semibold tracking-[0.18em] uppercase transition-colors hover:bg-champagne hover:text-charcoal" href="/discovery">Begin the scent finder →</Link>
          </div>
        </div>
      </section>

      <section className="border-b bg-ivory">
        <div className="mx-auto grid max-w-[90rem] divide-y px-5 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-12">
          {["Authenticity assured", "Complimentary consultation", "Thoughtful delivery"].map((label, index) => (
            <div className="px-2 py-8 text-center" key={label}>
              <p className="text-[0.58rem] font-semibold tracking-[0.18em] text-gold">0{index + 1}</p>
              <p className="mt-2 font-display text-xl">{label}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function FacetSelect({ label, name, options, value }: { label: string; name: string; options: CatalogFacetOption[]; value?: string }) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select className="h-12 w-full border bg-white px-3 text-xs text-charcoal outline-none transition-colors focus:border-gold" defaultValue={value ?? ""} name={name}>
        <option value="">{label}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </label>
  );
}

function PremiumEmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="mt-12 grid overflow-hidden border border-charcoal/15 lg:grid-cols-[1.05fr_.95fr]">
      <div className="relative overflow-hidden bg-charcoal p-8 text-pearl sm:p-12">
        <div aria-hidden="true" className="absolute -right-20 -top-20 size-64 rounded-full border border-champagne/20" />
        <div aria-hidden="true" className="absolute -right-4 top-24 size-32 rounded-full border border-champagne/15" />
        <p className="text-[0.64rem] tracking-[0.2em] text-champagne uppercase">{filtered ? "A quieter result" : "The opening edit"}</p>
        <h3 className="mt-5 max-w-lg font-display text-5xl leading-[0.95] sm:text-6xl">
          {filtered ? "No composition meets every detail." : "Our first fragrances are being chosen."}
        </h3>
        <p className="mt-6 max-w-lg text-sm leading-7 text-pearl/65">
          {filtered
            ? "Broaden your selection or let the Scent Finder introduce a different direction."
            : "Every bottle enters the Solure wardrobe slowly—reviewed for character, craft, and the feeling it leaves behind."}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {filtered ? <Link className="inline-flex min-h-12 items-center justify-center bg-champagne px-6 text-[0.62rem] font-semibold tracking-[0.16em] text-charcoal uppercase" href="/shop#catalogue">Clear filters</Link> : null}
          <Link className="inline-flex min-h-12 items-center justify-center border border-pearl/35 px-6 text-[0.62rem] font-semibold tracking-[0.16em] uppercase transition-colors hover:border-champagne hover:text-champagne" href="/discovery">Find my direction</Link>
        </div>
      </div>
      <div className="bg-white p-8 sm:p-12">
        <p className="text-[0.64rem] tracking-[0.2em] text-gold uppercase">What defines the edit</p>
        <div className="mt-8 divide-y">
          {[
            ["01", "Distinctive character", "A point of view that remains recognisable from first spray to drydown."],
            ["02", "Considered craft", "Composition, materials and performance examined as one complete experience."],
            ["03", "A lasting memory", "Fragrances selected for how naturally they become part of your story."],
          ].map(([index, title, copy]) => (
            <div className="grid grid-cols-[2rem_1fr] gap-4 py-5 first:pt-0" key={index}>
              <span className="text-[0.6rem] font-semibold text-gold">{index}</span>
              <div>
                <h4 className="font-display text-2xl">{title}</h4>
                <p className="mt-2 text-xs leading-5 text-muted">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Pagination({ filters, result }: { filters: ShopFilterState; result: PaginatedProducts }) {
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
    return `/shop?${params.toString()}#catalogue`;
  };

  return (
    <nav aria-label="Catalogue pagination" className="flex items-center justify-between border-t py-8 text-xs">
      {result.page > 1 ? <Link className="font-semibold uppercase tracking-wider hover:text-gold" href={hrefForPage(result.page - 1)}>← Previous</Link> : <span />}
      <span className="text-muted">Page {result.page} of {totalPages}</span>
      {result.page < totalPages ? <Link className="font-semibold uppercase tracking-wider hover:text-gold" href={hrefForPage(result.page + 1)}>Next →</Link> : <span />}
    </nav>
  );
}
