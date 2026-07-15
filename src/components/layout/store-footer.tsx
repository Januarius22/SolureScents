import { Wordmark } from "@/components/brand/wordmark";
import { siteConfig } from "@/config/site";

/** Public-store footer. */
export function StoreFooter() {
  return (
    <footer className="border-t bg-charcoal text-pearl">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-8 px-5 py-12 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12">
        <div className="space-y-3">
          <Wordmark inverse />
          <p className="max-w-sm font-display text-2xl text-ivory/80">{siteConfig.tagline}</p>
        </div>
        <p className="text-xs tracking-wide text-ivory/60">© {new Date().getFullYear()} Solure Scents. All rights reserved.</p>
      </div>
    </footer>
  );
}
