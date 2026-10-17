"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowRight } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useRef } from "react";

import collectionArtwork from "../../../../public/images/solure-collections-editorial.png";

const ease = [0.22, 1, 0.36, 1] as const;
const imagePositions = ["8% center", "36% center", "67% center", "94% center"] as const;

export interface CollectionExperienceItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  hero_image_path: string | null;
  is_featured: boolean;
}

interface CollectionsExperienceProps {
  collections: CollectionExperienceItem[];
}

interface CollectionChapter {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  descriptors: readonly string[];
  href: string;
  imagePosition: string;
  imageSource: StaticImageData | string;
  live: boolean;
}

const launchChapters: readonly CollectionChapter[] = [
  {
    id: "quiet-rituals",
    name: "Quiet Rituals",
    eyebrow: "The intimate edit",
    description:
      "Soft musks, pale woods, and scents that settle close to the skin. Compositions made for unhurried mornings and private moments.",
    descriptors: ["Skin musk", "Soft woods", "Stillness"],
    href: "/discovery#consultation",
    imagePosition: imagePositions[0],
    imageSource: collectionArtwork,
    live: false,
  },
  {
    id: "golden-hour",
    name: "Golden Hour",
    eyebrow: "The luminous edit",
    description:
      "Amber, resin, and warm florals illuminated by the final light of day. Radiant fragrances with a generous, enveloping presence.",
    descriptors: ["Amber", "Resin", "Radiance"],
    href: "/discovery#consultation",
    imagePosition: imagePositions[1],
    imageSource: collectionArtwork,
    live: false,
  },
  {
    id: "after-dark",
    name: "After Dark",
    eyebrow: "The magnetic edit",
    description:
      "Smoked woods, spice, and shadowed resins. Expressive compositions chosen for evenings that ask for something unforgettable.",
    descriptors: ["Cedar", "Smoke", "Spice"],
    href: "/discovery#consultation",
    imagePosition: imagePositions[2],
    imageSource: collectionArtwork,
    live: false,
  },
  {
    id: "garden-in-motion",
    name: "Garden in Motion",
    eyebrow: "The verdant edit",
    description:
      "Dew-bright petals, green stems, and transparent florals. A modern garden captured at its most alive and unexpected.",
    descriptors: ["White floral", "Green notes", "Dew"],
    href: "/discovery#consultation",
    imagePosition: imagePositions[3],
    imageSource: collectionArtwork,
    live: false,
  },
] as const;

const collectionDescriptors = [
  ["Considered", "Expressive", "Enduring"],
  ["Textural", "Radiant", "Memorable"],
  ["Distinctive", "Layered", "Personal"],
  ["Modern", "Evocative", "Curated"],
] as const;

function resolveLocalArtwork(path: string | null) {
  return path?.startsWith("/images/") ? path : collectionArtwork;
}

export function CollectionsExperience({ collections }: CollectionsExperienceProps) {
  const reduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const artworkY = useTransform(scrollYProgress, [0, 1], [0, 70]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, 30]);

  const chapters: CollectionChapter[] = collections.length
    ? collections.map((collection, index) => ({
        id: collection.id,
        name: collection.name,
        eyebrow: collection.is_featured ? "Featured collection" : "Curated collection",
        description:
          collection.description ??
          "An edited expression of scent, atmosphere, and the memories that remain.",
        descriptors: collectionDescriptors[index % collectionDescriptors.length] ?? collectionDescriptors[0],
        href: `/shop?collection=${collection.id}`,
        imagePosition: imagePositions[index % imagePositions.length] ?? imagePositions[0],
        imageSource: resolveLocalArtwork(collection.hero_image_path),
        live: true,
      }))
    : [...launchChapters];

  const featuredId = collections.find((collection) => collection.is_featured)?.id;
  const featured = chapters.find((chapter) => chapter.id === featuredId) ?? chapters[0]!;
  const remainingChapters = chapters.filter((chapter) => chapter.id !== featured.id);
  const hasLiveCollections = collections.length > 0;
  const revealInitial = reduceMotion ? false : { opacity: 0, y: 30 };

  return (
    <div className="overflow-clip bg-pearl">
      <section
        className="relative isolate min-h-[calc(100svh-7rem)] overflow-hidden border-b bg-charcoal text-pearl"
        ref={heroRef}
      >
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 -z-20 scale-[1.05]"
          style={reduceMotion ? undefined : { y: artworkY }}
        >
          <Image
            alt=""
            className="object-cover object-center"
            fill
            loading="eager"
            placeholder="blur"
            sizes="100vw"
            src={collectionArtwork}
          />
        </motion.div>
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(29,27,25,.96)_0%,rgba(29,27,25,.86)_37%,rgba(29,27,25,.26)_70%,rgba(29,27,25,.42)_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(29,27,25,.12),transparent_45%,rgba(29,27,25,.56))]"
        />

        <div className="mx-auto flex min-h-[calc(100svh-7rem)] max-w-[90rem] items-center px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <motion.div
            className="max-w-4xl"
            style={reduceMotion ? undefined : { y: copyY }}
          >
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4"
              initial={revealInitial}
              transition={{ duration: 0.75, ease }}
            >
              <span aria-hidden="true" className="h-px w-10 bg-champagne" />
              <p className="text-[0.66rem] font-semibold tracking-[0.25em] text-champagne uppercase">
                The Solure edit
              </p>
            </motion.div>

            <h1 className="mt-8 font-display text-[clamp(4.3rem,8.2vw,8.4rem)] leading-[0.79] tracking-[-0.045em]">
              <span className="block overflow-hidden pb-[0.11em]">
                <motion.span
                  animate={{ y: 0 }}
                  className="block"
                  initial={reduceMotion ? false : { y: "108%" }}
                  transition={{ delay: 0.08, duration: 1.05, ease }}
                >
                  Scent, arranged
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-[0.12em] text-champagne italic">
                <motion.span
                  animate={{ y: 0 }}
                  className="block"
                  initial={reduceMotion ? false : { y: "108%" }}
                  transition={{ delay: 0.18, duration: 1.05, ease }}
                >
                  by feeling.
                </motion.span>
              </span>
            </h1>

            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 max-w-xl text-base leading-8 text-pearl/72 sm:text-lg"
              initial={revealInitial}
              transition={{ delay: 0.42, duration: 0.85, ease }}
            >
              Each collection gathers fragrances around a shared atmosphere—a way of arriving, lingering, or being remembered.
            </motion.p>

            <motion.a
              animate={{ opacity: 1, y: 0 }}
              className="group mt-10 inline-flex min-h-12 items-center gap-4 border-b border-champagne/70 text-[0.65rem] font-semibold tracking-[0.18em] uppercase transition-colors hover:border-pearl hover:text-champagne"
              href="#collection-chapters"
              initial={revealInitial}
              transition={{ delay: 0.54, duration: 0.85, ease }}
            >
              Enter the collections
              <ArrowDown aria-hidden="true" className="transition-transform duration-300 group-hover:translate-y-1" size={15} />
            </motion.a>
          </motion.div>
        </div>

        <div className="absolute bottom-7 right-5 hidden items-center gap-4 sm:flex sm:right-8 lg:right-12">
          <span className="text-[0.58rem] tracking-[0.2em] text-pearl/55 uppercase">Mood · Material · Memory</span>
          <span aria-hidden="true" className="h-px w-12 bg-champagne/70" />
        </div>
      </section>

      <section className="border-b">
        <div className="mx-auto grid max-w-[90rem] gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.72fr_1.28fr] lg:gap-24 lg:px-12 lg:py-36">
          <motion.div
            initial={revealInitial}
            transition={{ duration: 0.75, ease }}
            viewport={{ amount: 0.45, once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <p className="text-[0.64rem] font-semibold tracking-[0.22em] text-gold uppercase">A different way to discover</p>
            <p className="mt-5 max-w-sm text-sm leading-7 text-muted">
              Fragrance rarely begins with a list of notes. It begins with a place, a temperature, or the version of yourself you want to inhabit.
            </p>
          </motion.div>
          <motion.p
            className="max-w-4xl font-display text-[clamp(2.8rem,5vw,5.4rem)] leading-[0.94] tracking-[-0.035em]"
            initial={revealInitial}
            transition={{ delay: 0.08, duration: 0.9, ease }}
            viewport={{ amount: 0.3, once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            We collect by <span className="text-gold italic">emotion</span>, so every fragrance already has somewhere to belong.
          </motion.p>
        </div>
      </section>

      <section className="bg-ivory" id="collection-chapters">
        <div className="mx-auto max-w-[90rem] px-5 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-36">
          <div className="flex flex-col justify-between gap-7 border-b pb-9 md:flex-row md:items-end">
            <div>
              <p className="text-[0.64rem] font-semibold tracking-[0.22em] text-gold uppercase">
                {hasLiveCollections ? "Featured collection" : "The opening chapters"}
              </p>
              <h2 className="mt-4 max-w-3xl font-display text-5xl leading-[0.94] tracking-[-0.03em] sm:text-7xl">
                Begin with an atmosphere.
              </h2>
            </div>
            {!hasLiveCollections ? (
              <p className="max-w-sm text-sm leading-6 text-muted md:text-right">
                A preview of the moods shaping our first edit. The fragrances themselves are still being chosen.
              </p>
            ) : null}
          </div>

          <FeaturedCollection chapter={featured} reduceMotion={reduceMotion} />

          {remainingChapters.length ? (
            <div className="mt-24 grid items-start gap-x-8 gap-y-20 md:grid-cols-2 lg:mt-32 lg:gap-x-16 lg:gap-y-28">
              {remainingChapters.map((chapter, index) => (
                <CollectionCard
                  chapter={chapter}
                  index={index + 1}
                  key={chapter.id}
                  offset={index % 2 === 1}
                  reduceMotion={reduceMotion}
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="bg-charcoal text-pearl">
        <div className="mx-auto grid max-w-[90rem] gap-16 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:px-12 lg:py-32">
          <motion.div
            initial={revealInitial}
            transition={{ duration: 0.85, ease }}
            viewport={{ amount: 0.3, once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <p className="text-[0.64rem] tracking-[0.22em] text-champagne uppercase">The curator&apos;s note</p>
            <blockquote className="mt-6 max-w-3xl font-display text-[clamp(2.9rem,5vw,5.5rem)] leading-[0.93] tracking-[-0.03em]">
              “A collection should not tell you what to wear. It should help you recognise what you feel.”
            </blockquote>
          </motion.div>

          <div className="divide-y divide-pearl/15 border-y border-pearl/15">
            {[
              ["01", "Character", "A clear point of view from first impression to lasting trace."],
              ["02", "Craft", "Materials and composition considered as one complete experience."],
              ["03", "Memory", "A scent chosen for what it leaves with you, not only what arrives first."],
            ].map(([number, title, copy], index) => (
              <motion.div
                className="grid grid-cols-[2.5rem_1fr] gap-5 py-6"
                initial={reduceMotion ? false : { opacity: 0, x: 24 }}
                key={number}
                transition={{ delay: index * 0.08, duration: 0.65, ease }}
                viewport={{ amount: 0.5, once: true }}
                whileInView={{ opacity: 1, x: 0 }}
              >
                <span className="pt-1 text-[0.6rem] text-champagne">{number}</span>
                <div>
                  <h3 className="font-display text-3xl">{title}</h3>
                  <p className="mt-2 max-w-md text-xs leading-6 text-pearl/60">{copy}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b bg-pearl">
        <div aria-hidden="true" className="absolute -right-28 top-1/2 size-96 -translate-y-1/2 rounded-full border border-champagne/25" />
        <div aria-hidden="true" className="absolute -right-4 top-1/2 size-52 -translate-y-1/2 rounded-full border border-gold/15" />
        <div className="relative mx-auto grid max-w-[90rem] gap-10 px-5 py-20 sm:px-8 sm:py-28 md:grid-cols-[1.1fr_.9fr] md:items-end lg:px-12">
          <div>
            <p className="text-[0.64rem] font-semibold tracking-[0.22em] text-gold uppercase">Choose your next chapter</p>
            <h2 className="mt-5 max-w-3xl font-display text-5xl leading-[0.92] tracking-[-0.03em] sm:text-7xl">
              Follow instinct.<br />We&apos;ll refine the rest.
            </h2>
          </div>
          <div className="md:text-right">
            <p className="max-w-lg text-sm leading-7 text-muted md:ml-auto">
              Begin with three intuitive choices, or browse every composition in the complete Solure edit.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row md:justify-end">
              <Link className="group inline-flex min-h-13 items-center justify-center gap-5 bg-charcoal px-7 text-[0.64rem] font-semibold tracking-[0.18em] text-white uppercase transition-colors hover:bg-gold" href="/discovery">
                Find your signature
                <ArrowRight aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1" size={15} />
              </Link>
              <Link className="inline-flex min-h-13 items-center justify-center border border-charcoal/25 px-7 text-[0.64rem] font-semibold tracking-[0.18em] uppercase transition-colors hover:border-gold hover:text-gold" href="/shop">
                Explore all scents
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeaturedCollection({ chapter, reduceMotion }: { chapter: CollectionChapter; reduceMotion: boolean | null }) {
  return (
    <motion.article
      className="mt-12 grid overflow-hidden border border-charcoal/15 bg-pearl lg:grid-cols-[1.12fr_.88fr]"
      initial={reduceMotion ? false : { opacity: 0, y: 36 }}
      transition={{ duration: 0.9, ease }}
      viewport={{ amount: 0.2, once: true }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className="group relative min-h-[29rem] overflow-hidden sm:min-h-[38rem] lg:min-h-[46rem]">
        <Image
          alt={`${chapter.name} collection atmosphere`}
          className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.035]"
          fill
          sizes="(min-width: 1024px) 58vw, 100vw"
          src={chapter.imageSource}
          style={{ objectPosition: chapter.imagePosition }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-charcoal/40 via-transparent to-transparent" />
        <span className="absolute bottom-6 left-6 border border-pearl/35 bg-charcoal/25 px-4 py-3 text-[0.58rem] tracking-[0.18em] text-pearl uppercase backdrop-blur-sm sm:bottom-8 sm:left-8">
          {chapter.live ? "Available now" : "In composition"}
        </span>
      </div>

      <div className="flex flex-col justify-between p-8 sm:p-12 lg:p-14">
        <div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-[0.62rem] tracking-[0.2em] text-gold uppercase">{chapter.eyebrow}</p>
            <span className="font-display text-2xl text-gold/70">I</span>
          </div>
          <h3 className="mt-16 font-display text-6xl leading-[0.86] tracking-[-0.035em] sm:text-7xl">{chapter.name}</h3>
          <p className="mt-7 max-w-lg text-sm leading-7 text-muted">{chapter.description}</p>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-y py-5 text-[0.6rem] font-semibold tracking-[0.15em] uppercase">
            {chapter.descriptors.map((descriptor) => <li key={descriptor}>{descriptor}</li>)}
          </ul>
        </div>
        <Link className="group mt-12 inline-flex w-fit items-center gap-5 border-b border-charcoal/35 pb-2 text-[0.64rem] font-semibold tracking-[0.17em] uppercase transition-colors hover:border-gold hover:text-gold" href={chapter.href}>
          {chapter.live ? "Explore the collection" : "Find this feeling"}
          <ArrowRight aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1" size={14} />
        </Link>
      </div>
    </motion.article>
  );
}

function CollectionCard({ chapter, index, offset, reduceMotion }: { chapter: CollectionChapter; index: number; offset: boolean; reduceMotion: boolean | null }) {
  return (
    <motion.article
      className={offset ? "md:mt-28" : undefined}
      initial={reduceMotion ? false : { opacity: 0, y: 42 }}
      transition={{ duration: 0.85, ease }}
      viewport={{ amount: 0.18, once: true }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <Link className="group block" href={chapter.href}>
        <div className="relative aspect-[4/5] overflow-hidden bg-charcoal">
          <Image
            alt={`${chapter.name} collection atmosphere`}
            className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.045]"
            fill
            sizes="(min-width: 768px) 46vw, 100vw"
            src={chapter.imageSource}
            style={{ objectPosition: chapter.imagePosition }}
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-charcoal/55 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6 text-pearl sm:p-8">
            <span className="text-[0.58rem] tracking-[0.18em] uppercase">{chapter.eyebrow}</span>
            <span className="font-display text-3xl text-champagne">{String(index + 1).padStart(2, "0")}</span>
          </div>
        </div>
        <div className="border-x border-b border-charcoal/15 bg-pearl p-7 sm:p-9">
          <h3 className="font-display text-4xl tracking-[-0.02em] transition-colors group-hover:text-gold sm:text-5xl">{chapter.name}</h3>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted">{chapter.description}</p>
          <div className="mt-7 flex items-end justify-between gap-5 border-t pt-5">
            <p className="text-[0.58rem] font-semibold tracking-[0.14em] text-muted uppercase">{chapter.descriptors.join(" · ")}</p>
            <ArrowRight aria-hidden="true" className="shrink-0 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-gold" size={16} />
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
