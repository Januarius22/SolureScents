import { cn } from "@/lib/utils/cn";

interface ProductVisualProps { className?: string; label?: string }

/** Brand-native fragrance silhouette used until curated product photography is uploaded. */
export function ProductVisual({ className, label = "Solure" }: ProductVisualProps) {
  return (
    <div className={cn("relative grid aspect-[4/5] place-items-center overflow-hidden bg-ivory", className)} aria-hidden="true">
      <div className="absolute inset-x-10 top-1/2 h-px bg-champagne/40" />
      <div className="relative mt-8 h-48 w-32 border border-champagne/70 bg-pearl/80 shadow-soft sm:h-56 sm:w-36">
        <div className="absolute -top-10 left-1/2 h-10 w-14 -translate-x-1/2 border border-charcoal/40 bg-charcoal" />
        <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 border-y border-champagne/50 py-5 text-center font-display text-xl tracking-[0.12em] uppercase">{label}</div>
      </div>
    </div>
  );
}
