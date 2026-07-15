import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

/** Phase-one brand canvas for the future storefront. */
export default function HomePage() {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-5rem)] items-center overflow-hidden px-5 py-24 sm:px-8 lg:px-12">
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
  );
}
