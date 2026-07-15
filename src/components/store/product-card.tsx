import Link from "next/link";

import { ProductVisual } from "@/components/store/product-visual";
import type { ProductSummary } from "@/features/catalog/types/catalog";
import { formatMoney } from "@/lib/utils/money";

export function ProductCard({ product }: { product: ProductSummary }) {
  const firstVariant = product.variants[0];
  return (
    <article className="group">
      <Link href={`/shop/${product.slug}`} className="block">
        <ProductVisual label={product.name.slice(0, 12)} />
        <div className="pt-5">
          <p className="text-[0.65rem] tracking-[0.18em] text-gold uppercase">{product.concentration}</p>
          <h2 className="mt-2 font-display text-2xl group-hover:text-gold">{product.name}</h2>
          <p className="mt-1 text-sm text-muted">{product.subtitle ?? "A distinctive composition"}</p>
          {firstVariant ? <p className="mt-3 text-sm font-semibold">From {formatMoney(firstVariant.price.amountMinor, firstVariant.price.currency)}</p> : null}
        </div>
      </Link>
    </article>
  );
}
