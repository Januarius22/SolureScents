import Link from "next/link";

import { ProductVisual } from "@/components/store/product-visual";
import type { ProductSummary } from "@/features/catalog/types/catalog";
import { formatMoney } from "@/lib/utils/money";

export function ProductCard({ product }: { product: ProductSummary }) {
  const firstVariant = product.variants[0];
  return (
    <article className="group h-full">
      <Link href={`/shop/${product.slug}`} className="flex h-full flex-col">
        <div className="relative overflow-hidden">
          <ProductVisual className="transition-transform duration-700 ease-out group-hover:scale-[1.025]" label={product.name.slice(0, 12)} />
          <span className="absolute left-4 top-4 bg-pearl/90 px-3 py-2 text-[0.58rem] font-semibold tracking-[0.16em] uppercase backdrop-blur-sm">
            {product.concentration}
          </span>
          <span className="absolute inset-x-4 bottom-4 translate-y-3 bg-charcoal px-4 py-3 text-center text-[0.6rem] font-semibold tracking-[0.18em] text-white uppercase opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            Explore the scent →
          </span>
        </div>
        <div className="flex flex-1 flex-col border-x border-b border-transparent px-1 pt-5 transition-colors duration-300 group-hover:border-border group-hover:px-4 group-hover:pb-4">
          <p className="text-[0.58rem] tracking-[0.18em] text-gold uppercase">The Solure edit</p>
          <h2 className="mt-2 font-display text-2xl transition-colors group-hover:text-gold">{product.name}</h2>
          <p className="mt-1 text-sm leading-6 text-muted">{product.subtitle ?? "A distinctive composition"}</p>
          {firstVariant ? (
            <div className="mt-auto flex items-end justify-between gap-4 pt-5 text-sm">
              <p className="font-semibold">From {formatMoney(firstVariant.price.amountMinor, firstVariant.price.currency)}</p>
              <p className="text-xs text-muted">{firstVariant.sizeMl} ml</p>
            </div>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
