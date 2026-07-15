import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { SectionHeading } from "@/components/ui/section-heading";

/** Phase-one brand canvas for the future storefront. */
export default function HomePage() {
  return (
    <>
    <section className="relative isolate flex min-h-[calc(100svh-7rem)] items-center overflow-hidden px-5 py-24 sm:px-8 lg:px-12">
      <div aria-hidden="true" className="absolute inset-y-0 right-0 -z-10 w-1/2 bg-ivory/70" />
      <div className="mx-auto w-full max-w-[90rem]">
        <div className="max-w-4xl">
          <p className="mb-6 text-xs font-semibold tracking-[0.24em] text-gold uppercase">A new fragrance destination</p>
          <h1 className="font-display text-6xl leading-[0.88] tracking-[-0.03em] sm:text-7xl lg:text-[7.5rem]">
            Scents That Speak.<br />
            <span className="text-gold">Memories That Stay.</span>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-8 text-muted sm:text-lg">{siteConfig.description}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/shop" className={buttonStyles("primary")}>Explore fragrances</Link>
            <Link href="/about" className={buttonStyles("secondary")}>Our philosophy</Link>
          </div>
        </div>
      </div>
    </section>
    <section className="border-y bg-surface px-5 py-24 sm:px-8 lg:px-12"><div className="mx-auto grid max-w-[90rem] gap-14 lg:grid-cols-[0.8fr_1.2fr]"><SectionHeading eyebrow="The Solure standard" title="Chosen slowly. Remembered instantly."/><div className="grid gap-8 sm:grid-cols-3">{[{n:"01",t:"Authentic",d:"Every bottle is sourced through trusted channels."},{n:"02",t:"Considered",d:"An edited collection, never an endless catalogue."},{n:"03",t:"Personal",d:"Guidance shaped around how you want to feel."}].map(x=><div key={x.n} className="border-t border-champagne pt-5"><span className="text-xs text-gold">{x.n}</span><h2 className="mt-5 font-display text-2xl">{x.t}</h2><p className="mt-3 text-sm leading-6 text-muted">{x.d}</p></div>)}</div></div></section>
    <section className="px-5 py-28 text-center sm:px-8"><p className="text-xs tracking-[0.2em] text-gold uppercase">Private consultation</p><h2 className="mx-auto mt-5 max-w-3xl font-display text-5xl sm:text-7xl">Find the fragrance that already feels like a memory.</h2><Link href="/contact" className={buttonStyles("primary", "mt-10")}>Speak with Solure</Link></section>
    </>
  );
}
