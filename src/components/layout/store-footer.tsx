import { Wordmark } from "@/components/brand/wordmark";
import { siteConfig } from "@/config/site";
import Link from "next/link";

/** Public-store footer. */
export function StoreFooter() {
  return (
    <footer className="border-t bg-charcoal text-pearl">
      <div className="mx-auto grid max-w-[90rem] gap-12 px-5 py-14 sm:px-8 md:grid-cols-2 lg:grid-cols-4 lg:px-12">
        <div className="space-y-3">
          <Wordmark inverse />
          <p className="max-w-sm font-display text-2xl text-ivory/80">{siteConfig.tagline}</p>
        </div>
        <div>
          <p className="text-xs tracking-[.15em] text-champagne uppercase">Discover</p>
          <nav className="mt-5 space-y-3 text-sm text-ivory/70">
            <Link className="block transition-colors hover:text-white" href="/shop">Shop Fragrances</Link>
            <Link className="block transition-colors hover:text-white" href="/collections">Collections</Link>
            <Link className="block transition-colors hover:text-white" href="/discovery">Scent Finder</Link>
            <Link className="block transition-colors hover:text-white" href="/search">Search Catalogue</Link>
          </nav>
        </div>
        <div>
          <p className="text-xs tracking-[.15em] text-champagne uppercase">Concierge</p>
          <nav className="mt-5 space-y-3 text-sm text-ivory/70">
            <Link className="block transition-colors hover:text-white" href="/contact">Contact Us</Link>
            <Link className="block transition-colors hover:text-white" href="/track-order">Track an Order</Link>
            <Link className="block transition-colors hover:text-white" href="/about">Our Story</Link>
          </nav>
        </div>
        <p className="self-end text-xs tracking-wide text-ivory/60">© {new Date().getFullYear()} Solure Scents.<br/>All rights reserved.</p>
      </div>
    </footer>
  );
}
