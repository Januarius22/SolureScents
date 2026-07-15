import type { ReactNode } from "react";

import { Wordmark } from "@/components/brand/wordmark";
import { siteConfig } from "@/config/site";

/** Independent authentication layout shared by every application role. */
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="grid min-h-screen bg-pearl lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden bg-charcoal p-12 text-pearl lg:flex lg:flex-col lg:justify-between">
        <Wordmark inverse />
        <div className="max-w-xl">
          <p className="text-xs font-semibold tracking-[0.22em] text-champagne uppercase">Private access</p>
          <p className="mt-6 font-display text-6xl leading-[0.95]">{siteConfig.tagline}</p>
        </div>
        <p className="text-xs text-ivory/50">A secure entrance for customers and the Solure team.</p>
      </section>
      <section className="flex items-center justify-center px-5 py-16 sm:px-8">
        <div className="w-full max-w-md">
          <Wordmark className="mb-14 inline-block lg:hidden" />
          {children}
        </div>
      </section>
    </main>
  );
}
