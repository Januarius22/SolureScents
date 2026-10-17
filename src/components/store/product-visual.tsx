import { cn } from "@/lib/utils/cn";

interface ProductVisualProps { className?: string; label?: string }

/** Brand-native fragrance silhouette used until curated product photography is uploaded. */
export function ProductVisual({ className, label = "Solure" }: ProductVisualProps) {
  return (
    <div className={cn("relative grid aspect-[4/5] place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_42%,#fff_0%,#f5f0e6_48%,#ece2d2_100%)]", className)} aria-hidden="true">
      <div className="absolute -right-16 top-8 size-52 rounded-full border border-champagne/25" />
      <div className="absolute -left-12 bottom-8 size-36 rounded-full bg-white/35 blur-2xl" />
      <div className="absolute inset-x-10 top-1/2 h-px bg-champagne/45" />
      <div className="relative mt-8 h-48 w-32 border border-champagne/70 bg-pearl/75 shadow-soft backdrop-blur-sm transition-transform duration-700 ease-out group-hover:-translate-y-2 sm:h-56 sm:w-36">
        <div className="absolute -top-10 left-1/2 h-10 w-14 -translate-x-1/2 border border-charcoal/40 bg-charcoal transition-colors duration-500 group-hover:bg-gold" />
        <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 border-y border-champagne/50 py-5 text-center font-display text-xl tracking-[0.12em] uppercase">{label}</div>
        <div className="absolute inset-x-3 bottom-3 h-px bg-champagne/30" />
      </div>
    </div>
  );
}
