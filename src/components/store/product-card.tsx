import Image from "next/image";
import Link from "next/link";

import { ProductVisual } from "@/components/store/product-visual";
import type { ProductSummary, ProductVariantSummary } from "@/features/catalog/types/catalog";
import { formatMoney } from "@/lib/utils/money";

export function ProductCard({ product }: { product: ProductSummary }) {
  // Sort variants by size ascending
  const sortedVariants = [...product.variants].sort((a, b) => a.sizeMl - b.sizeMl);
  const firstVariant = sortedVariants[0];

  // Minimum starting price among all available variants
  const minPriceVariant = sortedVariants.reduce<ProductVariantSummary | undefined>((min, curr) => {
    if (!min) return curr;
    return curr.price.amountMinor < min.price.amountMinor ? curr : min;
  }, firstVariant);

  // Extract unique sorted available bottle sizes (e.g. 10ml, 30ml, 50ml, 100ml)
  const availableSizes = Array.from(
    new Set(sortedVariants.map((v) => v.sizeMl).filter((size): size is number => typeof size === "number" && size > 0))
  );

  const concentrationLabel =
    product.concentration === "extrait"
      ? "Extrait de Parfum"
      : product.concentration === "parfum"
      ? "Pure Parfum"
      : product.concentration === "edp"
      ? "Eau de Parfum"
      : product.concentration === "edt"
      ? "Eau de Toilette"
      : product.concentration === "oil"
      ? "Perfume Oil"
      : "Eau de Cologne";

  // Infer category label from subtitle
  const subLower = (product.subtitle || "").toLowerCase();
  const categoryLabel =
    subLower.includes("women") || subLower.includes("woman") || subLower.includes("pour femme")
      ? "Pour Femme"
      : subLower.includes("men") || subLower.includes("man") || subLower.includes("pour homme")
      ? "Pour Homme"
      : "Unisex";

  return (
    <article className="group relative flex h-full flex-col overflow-hidden border border-charcoal/10 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-[0_16px_40px_rgba(29,27,25,0.08)]">
      <Link href={`/shop/${product.slug}`} className="flex h-full flex-col">
        {/* Image Showcase Container */}
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-b from-[#FAF8F5] via-[#F4EFE6] to-[#ECE5D8]">
          {product.primaryImageUrl ? (
            <Image
              src={product.primaryImageUrl}
              alt={product.name}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              unoptimized={product.primaryImageUrl.startsWith("http://localhost")}
            />
          ) : (
            <ProductVisual
              className="transition-transform duration-700 ease-out group-hover:scale-105"
              label={product.name.slice(0, 12)}
            />
          )}

          {/* Subtle Ambient Vignette Overlay */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/25 via-transparent to-black/5"
          />

          {/* Luxury Floating Badges (Responsive & Non-overlapping) */}
          <div className="absolute left-2 top-2 sm:left-3.5 sm:top-3.5 z-10 flex flex-col gap-1 sm:gap-1.5 items-start max-w-[62%]">
            {product.collection && (
              <div
                className={`flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 text-[7px] sm:text-[8.5px] font-bold tracking-[0.14em] sm:tracking-[0.2em] uppercase backdrop-blur-md shadow-xs rounded-xs truncate max-w-full ${
                  product.collection === "premium"
                    ? "bg-gold text-charcoal border border-amber-300 font-extrabold"
                    : "bg-charcoal/90 text-pearl border border-charcoal/40"
                }`}
              >
                <span className="truncate">{product.collection === "premium" ? "✦ Premium" : "Regular"}</span>
              </div>
            )}
            <div className="flex items-center gap-1 bg-charcoal/90 px-1.5 py-0.5 sm:px-2 sm:py-0.5 text-[6.5px] sm:text-[8.5px] font-semibold tracking-[0.14em] sm:tracking-[0.18em] text-pearl uppercase backdrop-blur-md shadow-xs">
              <span>{product.concentration.toUpperCase()}</span>
            </div>
          </div>

          <div className="absolute right-2 top-2 sm:right-3.5 sm:top-3.5 z-10 bg-pearl/90 border border-gold/30 px-1.5 py-0.5 sm:px-2.5 sm:py-1 text-[7px] sm:text-[9px] font-semibold tracking-[0.12em] sm:tracking-[0.14em] text-gold uppercase backdrop-blur-md shadow-xs max-w-[35%] truncate text-center">
            <span className="truncate">{categoryLabel}</span>
          </div>

          {/* Quick Explore Action Banner (glides up on desktop hover) */}
          <div className="hidden sm:block absolute inset-x-4 bottom-4 z-10 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <span className="flex w-full items-center justify-center gap-2 bg-charcoal/95 py-2.5 text-[10px] font-semibold tracking-[0.2em] text-pearl uppercase shadow-lg backdrop-blur-sm transition-colors hover:bg-gold hover:text-charcoal">
              Explore Fragrance →
            </span>
          </div>
        </div>

        {/* Product Details Section */}
        <div className="flex flex-1 flex-col p-2.5 sm:p-5 bg-white">
          <p className="text-[0.52rem] sm:text-[0.62rem] font-semibold tracking-[0.18em] sm:tracking-[0.22em] text-gold uppercase truncate">
            {product.brandName || "Solure Scents"} {product.collection ? `· ${product.collection === "premium" ? "Premium" : "Regular"}` : "· Signature"}
          </p>

          <h2 className="mt-1 font-display text-sm sm:text-xl lg:text-2xl text-charcoal transition-colors duration-300 group-hover:text-gold line-clamp-1">
            {product.name}
          </h2>

          <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-muted line-clamp-1 sm:line-clamp-2 leading-tight sm:leading-relaxed">
            {product.subtitle ?? concentrationLabel}
          </p>

          {/* Price & Available Sizes Section */}
          {minPriceVariant ? (
            <div className="mt-auto border-t border-charcoal/8 pt-2 sm:pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
              <div className="flex items-baseline">
                {product.variants.length > 1 && (
                  <span className="text-[9px] sm:text-[10px] font-medium tracking-wider text-muted mr-1 uppercase">
                    From
                  </span>
                )}
                <span className="font-semibold text-charcoal text-xs sm:text-base tracking-tight whitespace-nowrap">
                  {formatMoney(minPriceVariant.price.amountMinor, minPriceVariant.price.currency)}
                </span>
              </div>

              {availableSizes.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 sm:justify-end">
                  {availableSizes.map((size) => (
                    <span
                      key={size}
                      className="inline-flex items-center border border-charcoal/15 bg-ivory/60 px-1.5 py-0.2 sm:px-2 sm:py-0.5 text-[8.5px] sm:text-[10px] font-medium tracking-wide text-charcoal transition-colors group-hover:border-gold/50"
                    >
                      {size}ml
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
