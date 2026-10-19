import type { Metadata } from "next";
import Image from "next/image";

import { ProductCard } from "@/components/store/product-card";
import { recommendFragrances } from "@/features/recommendations/services/recommendation-engine";
import {
  fragrancePreferencesSchema,
  type FragrancePreferences,
} from "@/features/recommendations/validation/preferences";

export const metadata: Metadata = {
  title: "Scent Finder",
  description: "Discover fragrances matched to your character, occasion, and desired presence.",
};

const moodOptions = [
  { value: "quiet", label: "Quiet", description: "Soft, intimate, close to the skin" },
  { value: "balanced", label: "Balanced", description: "Present, polished, effortlessly noticed" },
  { value: "bold", label: "Bold", description: "Expressive, magnetic, unforgettable" },
] as const;

const occasionOptions = [
  { value: "everyday", label: "Everyday", description: "Versatile ease from morning onward" },
  { value: "evening", label: "Evening", description: "Depth and presence after dark" },
  { value: "occasion", label: "Occasion", description: "A statement for memorable moments" },
] as const;

const characterOptions = [
  { value: "fresh", label: "Fresh", description: "Citrus, aromatics and lucid air" },
  { value: "floral", label: "Floral", description: "Petals, softness and modern bloom" },
  { value: "woody", label: "Woody", description: "Warm woods, earth and quiet depth" },
  { value: "amber", label: "Amber", description: "Resins, spice and enveloping warmth" },
] as const;

export default async function Page({ searchParams }: PageProps<"/discovery">) {
  const query = await searchParams;
  const submitted = query.match === "true";
  const preferenceResult = fragrancePreferencesSchema.safeParse({
    mood: query.mood,
    occasion: query.occasion,
    character: query.character,
  });
  const preferences = preferenceResult.success
    ? preferenceResult.data
    : fragrancePreferencesSchema.parse({});
  const matches = submitted ? await recommendFragrances(preferences) : [];

  return (
    <main className="w-full max-w-full overflow-hidden">
      <section className="relative isolate border-b bg-ivory">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(circle at 15% 20%, rgba(255,255,255,.95), transparent 42%), linear-gradient(120deg, transparent 55%, rgba(201,169,110,.14))",
          }}
        />
        <div className="mx-auto grid w-full min-w-0 max-w-[90rem] grid-cols-[minmax(0,1fr)] lg:grid-cols-[1.08fr_.92fr]">
          <header className="flex min-w-0 flex-col justify-center px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
            <div className="flex items-center gap-4">
              <span aria-hidden="true" className="h-px w-10 bg-gold" />
              <p className="text-[0.68rem] font-semibold tracking-[0.24em] text-gold uppercase">
                The Solure scent consultation
              </p>
            </div>
            <h1 className="mt-7 max-w-4xl font-display text-6xl leading-[0.9] tracking-[-0.035em] sm:text-7xl lg:text-[6.4rem]">
              Find your
              <span className="block font-normal text-gold italic">signature.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-muted sm:text-lg">
              An intuitive edit shaped around your presence, your moments, and the notes that feel most like you.
            </p>
            <div className="mt-9 grid gap-3 border-t border-charcoal/10 pt-6 text-[0.62rem] font-medium tracking-[0.14em] text-charcoal/65 uppercase sm:flex sm:flex-wrap sm:gap-x-8 sm:text-[0.65rem] sm:tracking-[0.16em]">
              <span>Three considered questions</span>
              <span>Personal recommendations</span>
              <span>No profile stored</span>
            </div>
          </header>

          <div className="group relative min-h-[22rem] w-full min-w-0 overflow-hidden lg:min-h-[34rem]">
            <Image
              alt="Amber fragrance bottle in warm afternoon light"
              className="object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.025]"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 46vw"
              src="/images/solure-hero-fragrance.png"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-charcoal/55 via-transparent to-transparent" />
            <div className="absolute right-6 top-6 border border-white/45 bg-white/10 px-4 py-3 text-[0.62rem] tracking-[0.2em] text-white uppercase backdrop-blur-sm sm:right-8 sm:top-8">
              Private edit · 01—03
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-6 text-white sm:p-8">
              <p className="max-w-xs font-display text-3xl leading-tight">Scent begins where language ends.</p>
              <span className="hidden text-[0.62rem] tracking-[0.18em] uppercase sm:block">Curated by instinct</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[90rem] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-gold uppercase">Your fragrance profile</p>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl">Follow your instinct.</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted sm:text-right">
            There are no wrong answers. Choose the feeling that draws you in first.
          </p>
        </div>

        <form action="/discovery#results" className="border border-charcoal/15 bg-white shadow-soft" id="consultation" method="get">
          <input name="match" type="hidden" value="true" />
          <div className="flex flex-col justify-between gap-5 border-b border-white/10 bg-charcoal px-6 py-6 text-pearl sm:flex-row sm:items-center sm:px-8">
            <div>
              <p className="text-[0.62rem] tracking-[0.2em] text-champagne uppercase">Private scent consultation</p>
              <p className="mt-2 font-display text-2xl">Three details. One considered edit.</p>
            </div>
            <p className="text-[0.62rem] tracking-[0.18em] text-pearl/55 uppercase">Estimated time · 30 seconds</p>
          </div>

          <div className="grid divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            <Question label="Desired presence" name="mood" options={moodOptions} step="01" value={preferences.mood} />
            <Question label="Where will you wear it?" name="occasion" options={occasionOptions} step="02" value={preferences.occasion} />
            <Question label="Scent character" name="character" options={characterOptions} step="03" value={preferences.character} />
          </div>

          <div className="flex flex-col justify-between gap-5 border-t bg-pearl px-6 py-6 sm:flex-row sm:items-center sm:px-8">
            <p className="flex items-center gap-3 text-xs leading-5 text-muted">
              <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full border border-gold/50 text-gold">◇</span>
              Your choices stay within this consultation.
            </p>
            <button className="group inline-flex min-h-13 items-center justify-center gap-5 bg-charcoal px-8 text-[0.68rem] font-semibold tracking-[0.18em] text-white uppercase transition-all duration-300 hover:bg-gold sm:min-w-64" type="submit">
              Reveal my edit
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </button>
          </div>
        </form>
      </section>

      {submitted ? (
        <section aria-live="polite" className="scroll-mt-40 border-t bg-ivory" id="results">
          <div className="mx-auto max-w-[90rem] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-gold uppercase">Curated for you</p>
                <h2 className="mt-3 font-display text-5xl sm:text-6xl">Your closest matches.</h2>
              </div>
              <a className="w-fit border-b border-charcoal pb-1 text-[0.65rem] font-semibold tracking-[0.16em] uppercase transition-colors hover:border-gold hover:text-gold" href="#consultation">
                Refine your answers
              </a>
            </div>

            {matches.length ? (
              <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                {matches.map((match, index) => (
                  <div className="relative border bg-white p-2.5 sm:p-4 shadow-[0_18px_55px_rgba(29,27,25,0.06)] flex flex-col justify-between" key={match.product.id}>
                    <div className="absolute right-4 top-4 sm:right-7 sm:top-7 z-10 bg-charcoal px-2 py-1 sm:px-3 sm:py-2 text-[0.55rem] sm:text-[0.62rem] tracking-[0.14em] text-white uppercase shadow-sm">
                      {match.score}% match
                    </div>
                    <ProductCard product={match.product} />
                    <div className="mt-3 sm:mt-5 border-t pt-3 sm:pt-4">
                      <p className="text-[0.55rem] sm:text-[0.62rem] font-semibold tracking-[0.16em] text-gold uppercase">
                        Match {String(index + 1).padStart(2, "0")}
                      </p>
                      <p className="mt-1 sm:mt-2 text-[11px] sm:text-xs leading-4 sm:leading-5 text-muted">{match.reasons.join(". ")}.</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-10 border border-dashed border-gold/50 bg-white px-6 py-14 text-center">
                <p className="font-display text-3xl">The collection is being prepared.</p>
                <p className="mt-3 text-sm text-muted">Your profile is ready. Return soon to discover its closest match.</p>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}

type ScentOption = {
  value: string;
  label: string;
  description: string;
};

function Question({
  step,
  label,
  name,
  options,
  value,
}: {
  step: string;
  label: string;
  name: keyof FragrancePreferences;
  options: readonly ScentOption[];
  value: string;
}) {
  return (
    <fieldset className="min-w-0 p-6 sm:p-8 lg:p-7 xl:p-9">
      <legend className="w-full p-0">
        <span className="flex items-center justify-between gap-4">
          <span className="font-display text-2xl">{label}</span>
          <span className="text-[0.62rem] font-semibold tracking-[0.16em] text-gold">{step} / 03</span>
        </span>
      </legend>
      <div className="mt-6 space-y-3">
        {options.map((option) => (
          <label
            className="group relative flex min-h-20 cursor-pointer items-start gap-4 border border-charcoal/12 bg-white px-4 py-4 transition-all duration-300 has-checked:-translate-y-0.5 has-checked:border-gold has-checked:bg-ivory has-checked:shadow-[0_12px_28px_rgba(29,27,25,0.07)] hover:border-gold/60"
            key={option.value}
          >
            <input
              className="peer sr-only"
              defaultChecked={option.value === value}
              name={name}
              required
              type="radio"
              value={option.value}
            />
            <span aria-hidden="true" className="mt-1 size-4 shrink-0 rounded-full border border-charcoal/35 transition-all peer-checked:border-[5px] peer-checked:border-gold" />
            <span>
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="mt-1 block text-xs leading-5 text-muted">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
