"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpen, Clock, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

interface JournalArticle {
  id: string;
  title: string;
  slug: string;
  eyebrow: string;
  category: "Raw Materials" | "Olfactory Science" | "Rituals & Wear" | "Wardrobe Guides";
  excerpt: string;
  fullText: string[];
  readTime: string;
  date: string;
  author: string;
  isFeatured?: boolean;
}

const articles: JournalArticle[] = [
  {
    id: "architecture-of-sillage",
    title: "The Architecture of Sillage: Why Some Scents Linger Longer Than Words",
    slug: "architecture-of-sillage",
    eyebrow: "Cover Story · Olfactory Physics",
    category: "Olfactory Science",
    readTime: "7 min read",
    date: "October 2026",
    author: "Solure Editorial Studio",
    isFeatured: true,
    excerpt:
      "Longevity is not brute synthetic volume. It is an intricate architectural conversation between volatile citrus esters, body lipids, and the quiet resonance of tree resins.",
    fullText: [
      "The word 'sillage' stems from the French noun for wake—the subtle crest a wooden vessel leaves on the surface of calm water long after the hull has passed out of sight. In fine perfumery, it represents the invisible aura that hovers in an entryway, on the wool of an autumn coat, or in the air between two people who have just parted.",
      "Commercial fragrance houses often attempt to engineer projection through high-decibel synthetic fixatives. But true sillage is never aggressive. It is structural. It depends on molecular molecular weights, boiling points, and the precise rate of evaporation as a fragrance moves from the initial top flash to the heart and base.",
      "When a master perfumer blends Bergamot with Indonesian Patchouli and Somalian Frankincense, they are orchestrating a temporal score. The citrus molecules arrive and depart in fifteen minutes, leaving a lucid opening. The florals bloom over two to four hours. But it is the heavy sesquiterpenes in the resins that bind to skin moisture, warming slowly with your heartbeat.",
      "The result is a presence that does not demand attention, but rather rewards closeness.",
    ],
  },
  {
    id: "search-for-royal-oud",
    title: "In Search of Royal Oud: From Wild Agarwood to the Flacon",
    slug: "search-for-royal-oud",
    eyebrow: "Sourcing Journey",
    category: "Raw Materials",
    readTime: "6 min read",
    date: "September 2026",
    author: "Elena Vance · Master Evaluator",
    excerpt:
      "Authentic Aquilaria heartwood is formed only when a tree defends its own life. Why synthetic laboratory accords can never replicate the spiritual depth of aged resin.",
    fullText: [
      "No material in perfumery is as mythologized—or as frequently counterfeited—as oud. In its true form, oud is not wood at all. It is the fragrant resinous response of the Aquilaria tree to an ancient mold.",
      "Over decades, the tree saturates its heartwood with dark, dense aromatic compounds to seal the wound. When distilled through slow copper alembics, the resulting oil possesses an animalic warmth, dry cedar smoke, and a balsamic honey sweetness that cannot be synthesized in a chemistry lab.",
      "At Solure, we verify that every house using natural oud relies on sustainable, plantation-cultivated trees or certified heritage reserves, ensuring that ancient rainforests are protected while preserving one of mankind's oldest ceremonial treasures.",
    ],
  },
  {
    id: "three-temperatures-of-perfume",
    title: "The Three Temperatures: How Climate and Body Heat Shape the Heart",
    slug: "three-temperatures-of-perfume",
    eyebrow: "Composition & Climate",
    category: "Olfactory Science",
    readTime: "5 min read",
    date: "August 2026",
    author: "Solure Lab Notes",
    excerpt:
      "A fragrance tested in an air-conditioned boutique smells entirely foreign under afternoon humidity. Understanding how heat alters botanical diffusion.",
    fullText: [
      "Perfume is a living thermodynamic system. The moment liquid strikes skin, ambient temperature and surface lipids begin vaporizing notes at differing velocities.",
      "In cold weather, alcohol evaporates slowly, compressing the fragrance. Top notes linger unnaturally long, while rich ambers and musks stay dormant close to the skin. In warm humidity, conversely, top notes burn off in a flash, allowing the heavy balsamic base to radiate with surprising volume.",
      "This is why discerning collectors build seasonal wardrobes—choosing transparent vetivers and luminous nerolis for high summer, and saving resinous extraits for crisp evening air.",
    ],
  },
  {
    id: "extrait-renaissance",
    title: "The Extrait Renaissance: The Modern Luxury of Intimacy Over Loudness",
    slug: "extrait-renaissance",
    eyebrow: "Modern Perspectives",
    category: "Rituals & Wear",
    readTime: "4 min read",
    date: "July 2026",
    author: "Solure Editorial Studio",
    excerpt:
      "Moving beyond room-clearing projection toward pure perfume extraits—compositions designed not for the crowd, but for the person who embraces you.",
    fullText: [
      "For decades, commercial fragrance was dominated by sillage arms races: creating fragrances loud enough to cut through nightclubs and crowded subways. But luxury has turned inward.",
      "The revival of the Extrait de Parfum (concentrations exceeding 25% to 40% pure essence) reflects a craving for intimacy. Extraits project less into the ambient air; instead, their high oil concentration creates a tactile, skin-scent sheen that endures for twenty-four hours without shouting.",
      "It is the olfactory equivalent of cashmere: felt deeply by the wearer and discovered only by those invited close.",
    ],
  },
  {
    id: "curating-your-wardrobe",
    title: "The Four Pillars: How to Build an Edited Fragrance Wardrobe",
    slug: "curating-your-wardrobe",
    eyebrow: "The Solure Method",
    category: "Wardrobe Guides",
    readTime: "8 min read",
    date: "June 2026",
    author: "Januarius · Concierge Director",
    excerpt:
      "You do not need thirty bottles on a dresser. You need four intentional compositions that represent morning clarity, public poise, contemplative twilight, and formal celebration.",
    fullText: [
      "The modern fragrance shelf often suffers from abundance without intention. A collector buys on impulse, accumulating bottles that occupy the same sweet amber or citrus space.",
      "The Solure Method advocates for a strict four-pillar wardrobe: First, 'The Morning Lucid' (clean woods, neroli, or lucent musk for focused daily work). Second, 'The Polished Signature' (a balanced iris, cedar, or modern chypre that commands respect in meetings).",
      "Third, 'The Dusk Transition' (a sensual leather, spiced black tea, or velvet rose for intimate evenings). And fourth, 'The Ceremonial Statement' (a high-concentration extrait or rare oud reserved for nights that will be remembered forever).",
    ],
  },
  {
    id: "petals-in-the-dark",
    title: "Petals in the Dark: The Night-Blooming Flora That Perplex Noses",
    slug: "petals-in-the-dark",
    eyebrow: "Botanical Archives",
    category: "Raw Materials",
    readTime: "5 min read",
    date: "May 2026",
    author: "Solure Botanical Research",
    excerpt:
      "Tuberose, jasmine sambac, and datura—why certain flowers withhold their narcotic indolic aromas until the sun sets completely.",
    fullText: [
      "Flowers pollinated by daytime bees emit sweet, light, sugary volatile compounds. But flowers that rely on nocturnal hawk moths have evolved a drastically different strategy.",
      "As dusk settles, tuberose and night jasmine release heavy indoles, methyl anthranilate, and narcotic lactones capable of traveling miles through dark, cool air. In perfumery, these white florals provide an intoxicating, almost buttery creaminess that gives oriental and floral compositions their addictive, nocturnal magnetism.",
    ],
  },
];

const categories = [
  "All Stories",
  "Olfactory Science",
  "Raw Materials",
  "Rituals & Wear",
  "Wardrobe Guides",
] as const;

export function JournalExperience() {
  const reduceMotion = useReducedMotion();
  const [selectedCategory, setSelectedCategory] = useState<string>("All Stories");
  const [activeArticle, setActiveArticle] = useState<JournalArticle | null>(null);

  const filteredArticles = useMemo(() => {
    if (selectedCategory === "All Stories") return articles;
    return articles.filter((a) => a.category === selectedCategory);
  }, [selectedCategory]);

  const featured = useMemo(() => articles.find((a) => a.isFeatured) ?? articles[0]!, []);

  return (
    <div className="overflow-clip bg-pearl">
      {/* Editorial Header */}
      <section className="relative isolate border-b bg-ivory">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(circle at 20% 30%, rgba(201,169,110,0.12), transparent 40%), linear-gradient(130deg, #fbfaf7 0%, #f0e7db 100%)",
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
              <p className="text-[0.68rem] font-semibold tracking-[0.25em] text-gold uppercase">
                The Solure Journal · Volume IV
              </p>
            </div>

            <h1 className="mt-7 font-display text-[clamp(3.8rem,7vw,7.2rem)] leading-[0.88] tracking-[-0.04em]">
              Scent, ritual, <br />
              <span className="text-gold italic">and memory.</span>
            </h1>

            <p className="mt-8 max-w-2xl text-base leading-8 text-muted sm:text-lg">
              Notes on raw materials, master perfumers, olfactory physics, and the quiet ritual of wearing something extraordinary.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Featured Cover Story */}
      <section className="border-b bg-charcoal text-pearl">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="flex items-center gap-3 text-[0.64rem] tracking-[0.2em] text-champagne uppercase">
                <Sparkles size={13} aria-hidden="true" />
                <span>{featured.eyebrow}</span>
                <span>·</span>
                <span>{featured.readTime}</span>
              </div>

              <h2 className="mt-6 font-display text-4xl leading-[0.92] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
                {featured.title}
              </h2>

              <p className="mt-6 max-w-xl text-base leading-8 text-pearl/75">
                {featured.excerpt}
              </p>

              <div className="mt-8 flex items-center gap-6 text-xs text-pearl/50">
                <span>By {featured.author}</span>
                <span>·</span>
                <span>{featured.date}</span>
              </div>

              <div className="mt-10">
                <button
                  type="button"
                  onClick={() => setActiveArticle(featured)}
                  className="group inline-flex items-center gap-4 bg-champagne px-8 py-4 text-xs font-semibold tracking-[0.18em] text-charcoal uppercase transition-colors hover:bg-white"
                >
                  <span>Read cover story</span>
                  <ArrowRight
                    size={15}
                    aria-hidden="true"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </button>
              </div>
            </div>

            <div className="relative border border-pearl/20 bg-charcoal/40 p-8 sm:p-12">
              <span className="font-display text-7xl text-champagne/20">“</span>
              <p className="relative z-10 -mt-6 font-display text-2xl leading-snug tracking-tight text-ivory sm:text-3xl">
                The essence of a fragrance is not what announces itself in the room, but what lingers gently after you have left.
              </p>
              <div className="mt-8 border-t border-pearl/15 pt-5 text-right">
                <p className="text-xs font-semibold tracking-wider text-champagne uppercase">
                  Solure Editorial Principles
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="sticky top-20 z-30 border-b bg-pearl/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[90rem] items-center gap-2 overflow-x-auto px-5 py-4 sm:px-8 lg:px-12">
          {categories.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 px-4 py-2 text-[0.64rem] font-semibold tracking-[0.16em] uppercase transition-all duration-200 ${
                  active
                    ? "border-b-2 border-gold bg-charcoal text-pearl"
                    : "border border-transparent text-charcoal/70 hover:border-charcoal/20 hover:text-charcoal"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </section>

      {/* Articles Grid */}
      <section className="mx-auto max-w-[90rem] px-5 py-20 sm:px-8 lg:px-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.map((article, idx) => (
            <motion.article
              key={article.id}
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: idx * 0.06 }}
              className="group flex flex-col justify-between border border-charcoal/15 bg-white p-8 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-gold hover:shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between text-[0.62rem] tracking-[0.18em] text-gold uppercase">
                  <span>{article.category}</span>
                  <span className="flex items-center gap-1 text-muted">
                    <Clock size={11} aria-hidden="true" /> {article.readTime}
                  </span>
                </div>

                <h3 className="mt-5 font-display text-2xl tracking-tight transition-colors group-hover:text-gold sm:text-3xl">
                  {article.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-muted">
                  {article.excerpt}
                </p>
              </div>

              <div className="mt-8 border-t pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-[0.64rem] text-charcoal/60">
                    {article.date}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveArticle(article)}
                    className="group/read inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-charcoal uppercase transition-colors hover:text-gold"
                  >
                    <span>Read essay</span>
                    <ArrowRight
                      size={13}
                      aria-hidden="true"
                      className="transition-transform duration-300 group-hover/read:translate-x-1"
                    />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Article Reader Modal */}
      <AnimatePresence>
        {activeArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-10">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveArticle(null)}
              aria-hidden="true"
              className="fixed inset-0 bg-charcoal/70 backdrop-blur-sm"
            />

            {/* Modal Container */}
            <motion.div
              role="dialog"
              aria-labelledby="article-modal-title"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden border border-charcoal/20 bg-pearl shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b bg-ivory px-6 py-4 sm:px-8">
                <div className="flex items-center gap-3 text-[0.64rem] tracking-[0.2em] text-gold uppercase">
                  <BookOpen size={14} aria-hidden="true" />
                  <span>{activeArticle.category}</span>
                  <span>·</span>
                  <span>{activeArticle.readTime}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveArticle(null)}
                  aria-label="Close article"
                  className="size-9 rounded-full border border-charcoal/20 flex items-center justify-center text-charcoal transition-colors hover:border-gold hover:text-gold"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              {/* Content Body */}
              <div className="overflow-y-auto px-6 py-8 sm:px-10 sm:py-10">
                <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
                  {activeArticle.eyebrow}
                </p>
                <h2
                  id="article-modal-title"
                  className="mt-4 font-display text-3xl leading-tight sm:text-5xl"
                >
                  {activeArticle.title}
                </h2>
                <div className="mt-4 flex items-center gap-4 border-b pb-6 text-xs text-muted">
                  <span>Written by {activeArticle.author}</span>
                  <span>·</span>
                  <span>Published {activeArticle.date}</span>
                </div>

                <div className="mt-8 space-y-6 text-base leading-8 text-charcoal/85 font-serif sm:text-lg">
                  {activeArticle.fullText.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>

                <div className="mt-12 border-t pt-8">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-display text-xl">Continue Exploring</p>
                      <p className="text-xs text-muted">
                        Discover fragrances influenced by this story.
                      </p>
                    </div>
                    <Link
                      href="/shop"
                      onClick={() => setActiveArticle(null)}
                      className="inline-flex items-center justify-center gap-3 bg-charcoal px-6 py-3 text-xs font-semibold tracking-[0.16em] text-pearl uppercase hover:bg-gold transition-colors"
                    >
                      <span>Explore Shop</span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Editorial Newsletter Subscription */}
      <section className="border-t bg-charcoal px-5 py-20 text-pearl sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[0.66rem] font-semibold tracking-[0.24em] text-champagne uppercase">
            The Seasonal Dispatch
          </p>
          <h2 className="mt-5 font-display text-4xl leading-[0.94] tracking-[-0.03em] sm:text-6xl">
            Receive the Solure Edition.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-pearl/70">
            A quiet quarterly dispatch exploring rare harvests, master perfumer interviews, and private advance releases. No spam, ever.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert("Thank you. You have been placed on the private dispatch list.");
            }}
            className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="dispatch-email" className="sr-only">
              Email address
            </label>
            <input
              id="dispatch-email"
              type="email"
              required
              placeholder="Your email address"
              className="flex-1 border border-pearl/20 bg-charcoal/60 px-5 py-3.5 text-xs text-pearl tracking-wider placeholder:text-pearl/40 focus:border-champagne focus:outline-none"
            />
            <button
              type="submit"
              className="bg-champagne px-7 py-3.5 text-xs font-semibold tracking-[0.18em] text-charcoal uppercase transition-colors hover:bg-white"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
