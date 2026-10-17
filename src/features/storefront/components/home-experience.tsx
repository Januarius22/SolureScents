"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowDown, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import heroFragrance from "../../../../public/images/solure-hero-fragrance.png";
import { buttonStyles } from "@/components/ui/button";

const ease = [0.22, 1, 0.36, 1] as const;

const standards = [
  {
    number: "01",
    title: "Authentic",
    copy: "Every bottle is sourced through trusted channels and selected without compromise.",
  },
  {
    number: "02",
    title: "Considered",
    copy: "An edited collection shaped by character, craft, and the memories a scent can hold.",
  },
  {
    number: "03",
    title: "Personal",
    copy: "Human guidance that begins with how you want to feel, not what everyone else is wearing.",
  },
] as const;

const fragranceChapters = [
  {
    number: "I",
    label: "The first impression",
    title: "Light finds you first.",
    copy: "Citrus, spice, and green notes arrive in an instant—the opening gesture of the fragrance.",
  },
  {
    number: "II",
    label: "The heart",
    title: "Character takes shape.",
    copy: "Florals, woods, and resins settle closer to the skin and reveal the scent's true point of view.",
  },
  {
    number: "III",
    label: "The lasting trace",
    title: "Memory remains.",
    copy: "Amber, musk, and textured woods linger quietly—the part remembered long after you leave.",
  },
] as const;

const finderWords = ["intimate", "radiant", "magnetic", "unforgettable"] as const;

interface HomeExperienceProps {
  description: string;
}

export function HomeExperience({ description }: HomeExperienceProps) {
  const reduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const memoryRef = useRef<HTMLElement>(null);
  const [finderWord, setFinderWord] = useState(0);

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const { scrollYProgress: memoryProgress } = useScroll({
    target: memoryRef,
    offset: ["start 75%", "end 70%"],
  });

  const imageY = useTransform(heroProgress, [0, 1], [0, 92]);
  const imageScale = useTransform(heroProgress, [0, 1], [1.035, 1.1]);
  const copyY = useTransform(heroProgress, [0, 1], [0, 38]);
  const copyOpacity = useTransform(heroProgress, [0, 0.82], [1, 0.3]);
  const memoryLine = useTransform(memoryProgress, [0, 1], [0, 1]);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const interval = window.setInterval(() => {
      setFinderWord((current) => (current + 1) % finderWords.length);
    }, 2600);

    return () => window.clearInterval(interval);
  }, [reduceMotion]);

  const initialUp = reduceMotion ? false : { opacity: 0, y: 28 };
  const enterUp = { opacity: 1, y: 0 };

  return (
    <div className="overflow-clip bg-pearl">
      <section
        ref={heroRef}
        className="relative isolate min-h-[calc(100svh-7rem)] overflow-hidden border-b"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_72%_28%,rgba(201,169,110,0.13),transparent_31%),linear-gradient(115deg,#fbfaf7_0%,#fbfaf7_53%,#f1eadf_53%,#f1eadf_100%)]"
        />

        <div className="mx-auto grid min-h-[calc(100svh-7rem)] max-w-[90rem] lg:grid-cols-[1.08fr_0.92fr]">
          <motion.div
            className="relative z-10 flex items-center px-5 py-20 sm:px-8 lg:px-12 lg:py-24"
            style={reduceMotion ? undefined : { y: copyY, opacity: copyOpacity }}
          >
            <div className="max-w-4xl">
              <motion.div
                initial={initialUp}
                animate={enterUp}
                transition={{ duration: 0.8, ease }}
                className="mb-7 flex items-center gap-4"
              >
                <span className="h-px w-10 bg-gold" aria-hidden="true" />
                <p className="text-[0.68rem] font-semibold tracking-[0.25em] text-gold uppercase">
                  A new fragrance destination
                </p>
              </motion.div>

              <h1 className="font-display text-[clamp(4rem,6.2vw,6.8rem)] leading-[0.86] tracking-[-0.04em]">
                <span className="block overflow-hidden pb-[0.08em]">
                  <motion.span
                    className="block"
                    initial={reduceMotion ? false : { y: "108%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 1.05, delay: 0.08, ease }}
                  >
                    Scents that speak.
                  </motion.span>
                </span>
                <span className="block overflow-hidden pb-[0.12em] text-gold">
                  <motion.span
                    className="block"
                    initial={reduceMotion ? false : { y: "108%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 1.05, delay: 0.18, ease }}
                  >
                    Memories that stay.
                  </motion.span>
                </span>
              </h1>

              <motion.p
                initial={initialUp}
                animate={enterUp}
                transition={{ duration: 0.85, delay: 0.42, ease }}
                className="mt-8 max-w-xl text-base leading-8 text-muted sm:text-lg"
              >
                {description}
              </motion.p>

              <motion.div
                initial={initialUp}
                animate={enterUp}
                transition={{ duration: 0.85, delay: 0.54, ease }}
                className="mt-10 flex flex-wrap items-center gap-5"
              >
                <Link
                  href="/shop"
                  className={buttonStyles("primary", "group min-w-52 gap-3")}
                >
                  Explore fragrances
                  <ArrowRight
                    aria-hidden="true"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                    size={15}
                  />
                </Link>
                <Link
                  href="/discovery"
                  className="group inline-flex min-h-11 items-center gap-3 border-b border-charcoal/30 text-xs font-semibold tracking-[0.14em] uppercase transition-colors hover:border-gold hover:text-gold"
                >
                  Find your scent
                  <span
                    className="transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden="true"
                  >
                    ↗
                  </span>
                </Link>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            className="relative min-h-[34rem] overflow-hidden border-t border-border/60 sm:min-h-[42rem] lg:min-h-full lg:border-t-0 lg:border-l"
            initial={
              reduceMotion ? false : { opacity: 0, clipPath: "inset(0 0 100% 0)" }
            }
            animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
            transition={{ duration: 1.2, delay: 0.18, ease }}
          >
            <motion.div
              className="absolute -inset-8"
              style={reduceMotion ? undefined : { y: imageY, scale: imageScale }}
            >
              <Image
                src={heroFragrance}
                alt="Amber perfume bottle in warm afternoon light"
                fill
                priority
                placeholder="blur"
                sizes="(min-width: 1024px) 46vw, 100vw"
                className="object-cover"
              />
            </motion.div>
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-charcoal/25 via-transparent to-pearl/5"
            />
            <motion.div
              aria-hidden="true"
              className="absolute -right-32 top-16 size-[28rem] rounded-full border border-pearl/30"
              animate={reduceMotion ? undefined : { rotate: 360 }}
              transition={{ duration: 42, ease: "linear", repeat: Infinity }}
            >
              <span className="absolute left-8 top-7 size-2 rounded-full bg-pearl/80" />
            </motion.div>
            <motion.div
              initial={initialUp}
              animate={enterUp}
              transition={{ duration: 0.8, delay: 0.82, ease }}
              className="absolute bottom-6 left-6 right-6 flex items-end justify-between border-t border-pearl/60 pt-4 text-pearl sm:bottom-9 sm:left-9 sm:right-9"
            >
              <div>
                <p className="text-[0.62rem] tracking-[0.2em] uppercase">The Solure edit</p>
                <p className="mt-1 font-display text-2xl">No. 01 — Golden Hour</p>
              </div>
              <span className="hidden text-[0.62rem] tracking-[0.18em] uppercase sm:block">
                Eau de parfum
              </span>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={initialUp}
          animate={enterUp}
          transition={{ duration: 0.8, delay: 0.85, ease }}
          className="absolute bottom-7 left-12 hidden items-center gap-3 text-[0.58rem] font-semibold tracking-[0.2em] text-muted uppercase lg:flex"
        >
          <motion.span
            animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowDown aria-hidden="true" size={13} />
          </motion.span>
          Scroll to discover
        </motion.div>
      </section>

      <section aria-label="Solure qualities" className="overflow-hidden bg-charcoal py-4 text-pearl">
        <motion.div
          className="flex w-max items-center"
          animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 28, ease: "linear", repeat: Infinity }}
        >
          {[...Array(2)].flatMap((_, group) =>
            ["Authentic sourcing", "Personal curation", "Rare character", "Memorable trails"].map(
              (quality) => (
                <div
                  key={`${group}-${quality}`}
                  className="flex items-center gap-10 px-5 text-[0.62rem] tracking-[0.22em] uppercase sm:px-10"
                >
                  <span>{quality}</span>
                  <span className="size-1 rounded-full bg-champagne" aria-hidden="true" />
                </div>
              ),
            ),
          )}
        </motion.div>
      </section>

      <section className="px-5 py-28 sm:px-8 lg:px-12 lg:py-36">
        <div className="mx-auto grid max-w-[90rem] gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <motion.div
            initial={initialUp}
            whileInView={enterUp}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.9, ease }}
            className="lg:sticky lg:top-40 lg:self-start"
          >
            <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-gold uppercase">
              The Solure standard
            </p>
            <h2 className="mt-5 max-w-xl font-display text-5xl leading-[0.92] tracking-[-0.025em] sm:text-6xl lg:text-7xl">
              Chosen slowly. Remembered instantly.
            </h2>
            <p className="mt-7 max-w-md text-base leading-7 text-muted">
              Luxury is not abundance. It is the confidence to choose only what deserves a place in your story.
            </p>
          </motion.div>

          <div>
            {standards.map((standard, index) => (
              <motion.article
                key={standard.number}
                initial={reduceMotion ? false : { opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={reduceMotion ? undefined : { x: 8 }}
                viewport={{ once: true, amount: 0.45 }}
                transition={{ duration: 0.75, delay: index * 0.08, ease }}
                className="group grid gap-5 border-t py-9 sm:grid-cols-[5rem_1fr] sm:gap-8 lg:py-11"
              >
                <span className="font-display text-3xl text-champagne/80">{standard.number}</span>
                <div className="grid gap-3 md:grid-cols-[0.7fr_1.3fr] md:gap-8">
                  <h3 className="font-display text-3xl transition-colors group-hover:text-gold sm:text-4xl">
                    {standard.title}
                  </h3>
                  <p className="max-w-lg text-sm leading-7 text-muted">{standard.copy}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={memoryRef}
        className="relative overflow-hidden bg-charcoal px-5 py-28 text-pearl sm:px-8 lg:px-12 lg:py-40"
      >
        <div
          aria-hidden="true"
          className="absolute right-[-12rem] top-[-12rem] size-[34rem] rounded-full border border-champagne/15"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-[-18rem] left-[-15rem] size-[40rem] rounded-full border border-pearl/10"
        />

        <div className="relative mx-auto grid max-w-[90rem] gap-16 lg:grid-cols-[0.82fr_1.18fr] lg:gap-28">
          <div className="lg:sticky lg:top-40 lg:self-start">
            <motion.p
              initial={initialUp}
              whileInView={enterUp}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.75, ease }}
              className="text-[0.68rem] font-semibold tracking-[0.22em] text-champagne uppercase"
            >
              The anatomy of memory
            </motion.p>
            <motion.h2
              initial={initialUp}
              whileInView={enterUp}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.9, delay: 0.08, ease }}
              className="mt-5 max-w-2xl font-display text-5xl leading-[0.9] tracking-[-0.03em] sm:text-6xl lg:text-7xl"
            >
              A fragrance unfolds in chapters.
            </motion.h2>
            <motion.p
              initial={initialUp}
              whileInView={enterUp}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.85, delay: 0.16, ease }}
              className="mt-7 max-w-md text-sm leading-7 text-ivory/60"
            >
              What begins in the air becomes personal on skin. We help you understand every part of that journey.
            </motion.p>
          </div>

          <div className="relative pl-8 sm:pl-12">
            <div className="absolute bottom-0 left-0 top-0 w-px bg-pearl/15" aria-hidden="true">
              <motion.span
                className="block h-full origin-top bg-champagne"
                style={reduceMotion ? { scaleY: 1 } : { scaleY: memoryLine }}
              />
            </div>
            {fragranceChapters.map((chapter, index) => (
              <motion.article
                key={chapter.number}
                initial={reduceMotion ? false : { opacity: 0, y: 42 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.9, delay: index * 0.08, ease }}
                className="min-h-[20rem] border-t border-pearl/15 py-9 first:border-t-0 lg:min-h-[24rem] lg:py-12"
              >
                <div className="flex items-start justify-between gap-6">
                  <p className="text-[0.64rem] tracking-[0.2em] text-champagne uppercase">
                    {chapter.label}
                  </p>
                  <span className="font-display text-4xl text-pearl/15">{chapter.number}</span>
                </div>
                <h3 className="mt-12 max-w-lg font-display text-4xl leading-none sm:text-5xl">
                  {chapter.title}
                </h3>
                <p className="mt-6 max-w-lg text-sm leading-7 text-ivory/60">{chapter.copy}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-ivory px-5 py-28 sm:px-8 lg:px-12 lg:py-40">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 size-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-champagne/25"
        />
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-champagne/20"
        />

        <motion.div
          initial={initialUp}
          whileInView={enterUp}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease }}
          className="relative mx-auto max-w-6xl text-center"
        >
          <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-gold uppercase">
            Guided discovery
          </p>
          <h2 className="mt-7 font-display text-5xl leading-[0.94] tracking-[-0.03em] sm:text-7xl lg:text-8xl">
            Find a scent that feels{" "}
            <span className="relative inline-grid min-w-[7.4em] justify-items-center text-gold sm:min-w-[6.8em]">
              <span className="sr-only">unforgettable</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={finderWords[finderWord]}
                  aria-hidden="true"
                  initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -24 }}
                  transition={{ duration: 0.55, ease }}
                  className="col-start-1 row-start-1 italic"
                >
                  {finderWords[finderWord]}.
                </motion.span>
              </AnimatePresence>
            </span>
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-muted">
            Tell us about the mood, memory, and presence you want to create. We will turn instinct into a considered shortlist.
          </p>
          <Link
            href="/discovery"
            className={buttonStyles("primary", "group mt-10 min-w-56 gap-3")}
          >
            Begin scent finder
            <ArrowRight
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:translate-x-1"
              size={15}
            />
          </Link>
        </motion.div>
      </section>

      <section className="border-t bg-surface px-5 py-28 text-center sm:px-8 lg:py-36">
        <motion.div
          initial={initialUp}
          whileInView={enterUp}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.9, ease }}
          className="mx-auto max-w-4xl"
        >
          <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-gold uppercase">
            Private consultation
          </p>
          <h2 className="mt-6 font-display text-5xl leading-[0.94] tracking-[-0.025em] sm:text-7xl">
            Some fragrances should be discovered in conversation.
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-sm leading-7 text-muted">
            Speak with Solure for thoughtful, one-to-one guidance shaped around you or someone unforgettable.
          </p>
          <Link href="/contact" className={buttonStyles("secondary", "mt-10 min-w-52")}>
            Speak with Solure
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
