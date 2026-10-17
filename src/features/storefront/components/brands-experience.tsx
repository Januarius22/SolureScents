"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Compass, Filter, Globe2, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export interface BrandData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  country_code: string | null;
}

interface BrandsExperienceProps {
  initialBrands: BrandData[];
}

interface HouseEditorial {
  name: string;
  origin: string;
  region: "France & Italy" | "Middle East" | "International";
  tagline: string;
  description: string;
  accords: readonly string[];
  notableCreations: readonly string[];
}

const curatedHouses: HouseEditorial[] = [
  {
    name: "Maison Francis Kurkdjian",
    origin: "Paris, France",
    region: "France & Italy",
    tagline: "Architectural precision and luminous sillage.",
    description:
      "Founded by one of modern perfumery's greatest virtuosos, Maison Francis Kurkdjian envisions fragrance as an olfactory wardrobe of understated French sophistication.",
    accords: ["Amber Wood", "Jasmine", "Cedar", "Citrus"],
    notableCreations: ["Grand Soir", "Baccarat Rouge 540", "Gentle Fluidity Gold"],
  },
  {
    name: "Frédéric Malle",
    origin: "Paris, France",
    region: "France & Italy",
    tagline: "Editions de Parfums — fragrance as high literature.",
    description:
      "A publisher of bespoke olfactory masterpieces. Master perfumers are given absolute creative freedom without commercial constraint or formulaic deadlines.",
    accords: ["Turkish Rose", "Patchouli", "Incense", "Cinnamon"],
    notableCreations: ["Portrait of a Lady", "Musc Ravageur", "Carnal Flower"],
  },
  {
    name: "Amouage",
    origin: "Muscat, Oman",
    region: "Middle East",
    tagline: "The Gift of Kings — high concentration extraits.",
    description:
      "Born in the Sultanate of Oman, Amouage crafts lavish, multi-layered perfumes honoring Arabian incense, rare silver frankincense, and ancient ambergris traditions.",
    accords: ["Silver Frankincense", "Rock Rose", "Smoked Wood", "Myrrh"],
    notableCreations: ["Interlude Man", "Guidance", "Reflection 45"],
  },
  {
    name: "Byredo",
    origin: "Stockholm, Sweden",
    region: "International",
    tagline: "Memory distilled into minimalist, poetic forms.",
    description:
      "Bridging European aesthetics with Indian heritage, Byredo translates ephemeral emotional memories, historical nostalgia, and intimate sensations into crystalline scent.",
    accords: ["Bergamot", "Vetiver", "Orris", "Cashmere Wood"],
    notableCreations: ["Bal d'Afrique", "Gypsy Water", "Mojave Ghost"],
  },
  {
    name: "Diptyque",
    origin: "Paris, France",
    region: "France & Italy",
    tagline: "Botanical poetry and slow Mediterranean wanderlust.",
    description:
      "Originating at 34 Boulevard Saint-Germain, Diptyque's creations evoke sun-drenched orchards, rare botanical gardens, and the contemplative warmth of artist ateliers.",
    accords: ["Fig Leaf", "Sandalwood", "Pink Peppercorn", "White Musk"],
    notableCreations: ["Philosykos", "Tam Dao", "Fleur de Peau"],
  },
  {
    name: "Xerjoff",
    origin: "Turin, Italy",
    region: "France & Italy",
    tagline: "Italian goldsmithing meets rare natural absolutes.",
    description:
      "A celebrated Italian luxury house uniting exquisite Mediterranean citrus and rich orientals with sculpted hand-cut crystal and gold-leaf flacons.",
    accords: ["Honey", "Tobacco Leaf", "Lavender", "Tonka Bean"],
    notableCreations: ["Naxos", "Alexandria II", "Erba Pura"],
  },
  {
    name: "BDK Parfums",
    origin: "Paris, France",
    region: "France & Italy",
    tagline: "Sensual olfactory fiction set in contemporary Paris.",
    description:
      "Crafted in the Palais Royal, BDK treats each fragrance as a distinct narrative character, exploring tactile suede, spiced tea, and nocturnal French intrigue.",
    accords: ["Cardamom", "Fig", "Black Tea", "Bourbon Vetiver"],
    notableCreations: ["Gris Charnel", "Rouge Smoking", "Velvet Tonka"],
  },
  {
    name: "Le Labo",
    origin: "Grasse & New York",
    region: "International",
    tagline: "Wabi-sabi perfumery and raw artisanal soul.",
    description:
      "Rooted in Grasse traditions with an industrial New York spirit, Le Labo focuses on the sacred art of raw botanical compounding and quiet, intimate projection.",
    accords: ["Sandalwood", "Cardamom", "Cedar", "Violet"],
    notableCreations: ["Santal 33", "Thé Noir 29", "Another 13"],
  },
];

const regions = ["All Houses", "France & Italy", "Middle East", "International"] as const;

export function BrandsExperience({ initialBrands }: BrandsExperienceProps) {
  const reduceMotion = useReducedMotion();
  const [selectedRegion, setSelectedRegion] = useState<string>("All Houses");
  const [searchQuery, setSearchQuery] = useState("");

  // Merge database brands with curated editorial data
  const houses = useMemo(() => {
    if (initialBrands.length === 0) {
      return curatedHouses;
    }

    // Map DB brands, enriching with curated details when available
    return initialBrands.map((brand) => {
      const match = curatedHouses.find(
        (h) => h.name.toLowerCase() === brand.name.toLowerCase(),
      );
      return {
        name: brand.name,
        origin: match?.origin ?? (brand.country_code ? `Origin: ${brand.country_code}` : "International"),
        region: match?.region ?? "International",
        tagline: match?.tagline ?? "Distinctive fragrance composition and artisanal integrity.",
        description:
          brand.description ??
          match?.description ??
          "A respected fragrance house selected for its uncompromising point of view and rare craft.",
        accords: match?.accords ?? ["Curated Notes", "Signature Sillage", "Fine Extraction"],
        notableCreations: match?.notableCreations ?? ["Solure Edit Selection"],
      };
    });
  }, [initialBrands]);

  // Filter houses by region and search query
  const filteredHouses = useMemo(() => {
    return houses.filter((house) => {
      const matchesRegion =
        selectedRegion === "All Houses" || house.region === selectedRegion;
      const matchesQuery =
        !searchQuery.trim() ||
        house.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        house.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        house.accords.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesRegion && matchesQuery;
    });
  }, [houses, selectedRegion, searchQuery]);

  return (
    <div className="overflow-clip bg-pearl">
      {/* Editorial Hero */}
      <section className="relative isolate border-b bg-ivory">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(circle at 80% 20%, rgba(201,169,110,0.14), transparent 45%), linear-gradient(130deg, #fbfaf7 0%, #f4ede3 100%)",
          }}
        />

        <div className="mx-auto max-w-[90rem] px-5 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl"
          >
            <div className="flex items-center gap-4">
              <span className="h-px w-10 bg-gold" aria-hidden="true" />
              <p className="text-[0.68rem] font-semibold tracking-[0.24em] text-gold uppercase">
                The Curated Directory
              </p>
            </div>

            <h1 className="mt-7 font-display text-[clamp(3.8rem,7vw,7rem)] leading-[0.88] tracking-[-0.04em]">
              The houses behind <br />
              <span className="text-gold italic">every memory.</span>
            </h1>

            <p className="mt-8 max-w-2xl text-base leading-8 text-muted sm:text-lg">
              We partner exclusively with independent perfume houses, heritage ateliers, and visionary creators who treat fragrance as high art—sourced transparently and preserved in peak condition.
            </p>

            <div className="mt-10 grid gap-4 border-t border-charcoal/10 pt-7 text-xs sm:flex sm:flex-wrap sm:gap-8">
              <div className="flex items-center gap-3">
                <ShieldCheck aria-hidden="true" className="size-4 text-gold" />
                <span className="tracking-wide">Direct Ateliers Provenance</span>
              </div>
              <div className="flex items-center gap-3">
                <Globe2 aria-hidden="true" className="size-4 text-gold" />
                <span className="tracking-wide">Grasse, Paris, Milan, Muscat</span>
              </div>
              <div className="flex items-center gap-3">
                <Sparkles aria-hidden="true" className="size-4 text-gold" />
                <span className="tracking-wide">100% Guaranteed Authentic</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="sticky top-20 z-30 border-b bg-pearl/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[90rem] flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-8 lg:px-12">
          {/* Region Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 hidden items-center gap-1.5 text-[0.62rem] font-semibold tracking-[0.18em] text-gold uppercase md:inline-flex">
              <Filter size={13} aria-hidden="true" /> Region:
            </span>
            {regions.map((region) => {
              const active = selectedRegion === region;
              return (
                <button
                  key={region}
                  type="button"
                  onClick={() => setSelectedRegion(region)}
                  className={`px-4 py-2 text-[0.64rem] font-semibold tracking-[0.16em] uppercase transition-all duration-200 ${
                    active
                      ? "border-b-2 border-gold bg-charcoal text-pearl"
                      : "border border-transparent text-charcoal/70 hover:border-charcoal/20 hover:text-charcoal"
                  }`}
                >
                  {region}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search house or notes..."
              className="w-full border border-charcoal/20 bg-white/70 px-4 py-2 text-xs tracking-wide placeholder:text-muted/70 focus:border-gold focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Houses Grid */}
      <section className="mx-auto max-w-[90rem] px-5 py-20 sm:px-8 lg:px-12">
        <div className="flex items-baseline justify-between border-b pb-6">
          <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-gold uppercase">
            Showing {filteredHouses.length} {filteredHouses.length === 1 ? "House" : "Houses"}
          </p>
          <span className="text-[0.62rem] tracking-[0.16em] text-muted uppercase">
            Solure Partner Ateliers
          </span>
        </div>

        <AnimatePresence mode="popLayout">
          {filteredHouses.length > 0 ? (
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {filteredHouses.map((house, idx) => (
                <motion.article
                  key={house.name}
                  layout
                  initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.45, delay: idx * 0.05 }}
                  className="group flex flex-col justify-between border border-charcoal/15 bg-white p-8 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-gold hover:shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between text-[0.64rem] tracking-[0.2em] text-gold uppercase">
                      <span>{house.origin}</span>
                      <span className="text-charcoal/40">No. {String(idx + 1).padStart(2, "0")}</span>
                    </div>

                    <h2 className="mt-6 font-display text-3xl tracking-tight transition-colors group-hover:text-gold sm:text-4xl">
                      {house.name}
                    </h2>

                    <p className="mt-3 text-xs font-medium tracking-[0.08em] text-gold/90 uppercase italic">
                      “{house.tagline}”
                    </p>

                    <p className="mt-5 text-sm leading-7 text-muted">
                      {house.description}
                    </p>

                    {/* Accords */}
                    <div className="mt-6 border-t pt-5">
                      <p className="text-[0.58rem] font-semibold tracking-[0.16em] text-charcoal/60 uppercase">
                        Signature Accords
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {house.accords.map((accord) => (
                          <span
                            key={accord}
                            className="bg-ivory px-2.5 py-1 text-[0.62rem] font-medium tracking-wider text-charcoal/80"
                          >
                            {accord}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Notable Creations */}
                    <div className="mt-6 border-t pt-5">
                      <p className="text-[0.58rem] font-semibold tracking-[0.16em] text-charcoal/60 uppercase">
                        Notable Creations
                      </p>
                      <p className="mt-2 text-xs text-muted">
                        {house.notableCreations.join(" · ")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 border-t pt-6">
                    <Link
                      href={`/shop?q=${encodeURIComponent(house.name)}`}
                      className="group/link flex items-center justify-between text-xs font-semibold tracking-[0.16em] text-charcoal uppercase transition-colors hover:text-gold"
                    >
                      <span>Explore compositions</span>
                      <ArrowRight
                        aria-hidden="true"
                        size={15}
                        className="transition-transform duration-300 group-hover/link:translate-x-1.5"
                      />
                    </Link>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="mt-16 border border-dashed border-gold/40 bg-white p-16 text-center">
              <Compass className="mx-auto size-8 text-gold/60" aria-hidden="true" />
              <h3 className="mt-4 font-display text-3xl">No houses found</h3>
              <p className="mt-2 text-sm text-muted">
                Try searching for a different perfume house or reset your filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedRegion("All Houses");
                  setSearchQuery("");
                }}
                className="mt-6 border-b border-charcoal text-xs font-semibold tracking-[0.16em] uppercase hover:text-gold hover:border-gold"
              >
                Reset filters
              </button>
            </div>
          )}
        </AnimatePresence>
      </section>

      {/* Sourcing Concierge Banner */}
      <section className="border-t bg-charcoal px-5 py-20 text-pearl sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-[90rem] gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-[0.66rem] font-semibold tracking-[0.24em] text-champagne uppercase">
              Private Sourcing Request
            </p>
            <h2 className="mt-5 font-display text-4xl leading-[0.94] tracking-[-0.03em] sm:text-6xl">
              Seeking an unlisted creation or vintage extrait?
            </h2>
            <p className="mt-6 max-w-xl text-sm leading-7 text-pearl/70">
              Our concierge maintains relationships with European fragrance archives, bespoke perfumers, and authorized distributors worldwide. We can secure specific batches, discontinued favorites, or vault bottles.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row lg:justify-end">
            <Link
              href="/contact"
              className="inline-flex min-h-13 items-center justify-center gap-3 bg-champagne px-8 text-xs font-semibold tracking-[0.18em] text-charcoal uppercase transition-colors hover:bg-white"
            >
              Consult Concierge
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link
              href="/discovery"
              className="inline-flex min-h-13 items-center justify-center border border-pearl/30 px-8 text-xs font-semibold tracking-[0.18em] text-pearl uppercase transition-colors hover:border-champagne hover:text-champagne"
            >
              Take Scent Consultation
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
