"use client";

import { ArrowRight, Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/features/cart/context/cart-context";
import { ProductVisual } from "@/components/store/product-visual";
import { formatMoney } from "@/lib/utils/money";

export function CartView() {
  const { cart, updateQuantity, removeItem, isPending, pendingItemId, error } = useCart();

  const items = cart?.items ?? [];
  const itemCount = cart?.itemCount ?? 0;
  const subtotalMinor = cart?.subtotalMinor ?? 0;
  const currency = cart?.currency ?? "NGN";

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center sm:px-8">
        <div className="mx-auto mb-6 flex size-24 items-center justify-center rounded-full border border-champagne/40 bg-sand/30">
          <ShoppingBag size={32} strokeWidth={1.2} className="text-gold" />
        </div>
        <p className="text-xs font-semibold tracking-[0.24em] text-gold uppercase">
          Your bag is silent
        </p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl text-charcoal">
          Your fragrance journey begins here.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Curate a personal olfactory signature from our collection of rare extracts and artisanal perfumes.
        </p>
        <div className="mt-8">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 border border-charcoal bg-charcoal px-8 py-3.5 text-xs font-semibold tracking-[0.16em] text-pearl uppercase transition-all hover:border-gold hover:bg-gold hover:text-charcoal"
          >
            <span>Explore Fragrances</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12">
      <div className="border-b border-border/80 pb-6">
        <p className="text-xs tracking-[0.2em] text-gold uppercase">Your Selection</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl text-charcoal">
          Shopping Bag
        </h1>
        <p className="mt-1 text-xs text-muted">
          {itemCount} {itemCount === 1 ? "composition" : "compositions"} curated
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-sm border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          {error}
        </div>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_24rem]">
        {/* Line Items Table / List */}
        <div className="divide-y divide-border/60 border-y border-border/80">
          {items.map((item) => {
            const isItemPending = isPending && pendingItemId === item.id;

            return (
              <div key={item.id} className="grid gap-6 py-8 sm:grid-cols-[6rem_1fr_auto]">
                {/* Visual */}
                <div className="relative size-24 shrink-0 overflow-hidden border border-border/80 bg-sand/20">
                  <ProductVisual label={item.productName.slice(0, 8)} className="size-full" />
                </div>

                {/* Information & Controls */}
                <div className="flex flex-col justify-between">
                  <div>
                    <span className="text-[0.58rem] font-semibold tracking-[0.18em] text-gold uppercase">
                      {item.concentration}
                    </span>
                    <h2 className="font-display text-2xl text-charcoal">
                      <Link href={`/shop/${item.productSlug}`} className="transition-colors hover:text-gold">
                        {item.productName}
                      </Link>
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      {item.variantLabel} · {item.sizeMl} ml Flacon
                    </p>
                    <p className="mt-2 text-xs font-medium text-charcoal">
                      {formatMoney(item.unitPriceMinor, item.currency)} each
                    </p>
                  </div>

                  {/* Quantity and Remove */}
                  <div className="mt-6 flex items-center gap-6">
                    <div className="flex items-center border border-charcoal/20 bg-pearl">
                      <button
                        type="button"
                        disabled={isItemPending || item.quantity <= 1}
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label={`Decrease quantity of ${item.productName}`}
                        className="flex size-8 items-center justify-center text-charcoal transition-colors hover:bg-charcoal/5 disabled:opacity-30"
                      >
                        <Minus size={12} />
                      </button>

                      <span className="min-w-10 text-center font-display text-xs font-semibold text-charcoal">
                        {isItemPending ? (
                          <Loader2 size={12} className="mx-auto animate-spin text-muted" />
                        ) : (
                          item.quantity
                        )}
                      </span>

                      <button
                        type="button"
                        disabled={isItemPending || item.quantity >= 99}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label={`Increase quantity of ${item.productName}`}
                        className="flex size-8 items-center justify-center text-charcoal transition-colors hover:bg-charcoal/5 disabled:opacity-30"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isItemPending}
                      onClick={() => removeItem(item.id)}
                      className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-red-700 disabled:opacity-40"
                    >
                      <Trash2 size={13} strokeWidth={1.5} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>

                {/* Line Total */}
                <div className="flex items-start justify-between sm:flex-col sm:items-end">
                  <span className="text-xs text-muted sm:hidden">Total:</span>
                  <span className="font-display text-lg font-semibold text-charcoal">
                    {formatMoney(item.lineTotalMinor, item.currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary Card */}
        <aside aria-label="Order summary" className="h-fit border border-border/80 bg-pearl/60 p-6 sm:p-8">
          <h2 className="font-display text-xl text-charcoal">Order Summary</h2>

          <div className="mt-6 space-y-3 border-b border-border/60 pb-6 text-xs text-muted">
            <div className="flex justify-between">
              <span>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
              <span className="font-medium text-charcoal">
                {formatMoney(subtotalMinor, currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>Calculated at checkout</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-base">
            <span className="font-display text-charcoal">Estimated Total</span>
            <strong className="font-display text-2xl text-charcoal">
              {formatMoney(subtotalMinor, currency)}
            </strong>
          </div>

          <p className="mt-2 text-[0.62rem] text-muted">
            All prices in Nigerian naira (₦). Local taxes and courier fees finalized at checkout.
          </p>

          <div className="mt-8 space-y-3">
            <Link
              href="/checkout"
              className="flex w-full items-center justify-center gap-2 border border-charcoal bg-charcoal py-4 text-xs font-semibold tracking-[0.16em] text-pearl uppercase transition-all hover:border-gold hover:bg-gold hover:text-charcoal"
            >
              <span>Continue to Checkout</span>
              <ArrowRight size={14} />
            </Link>

            <Link
              href="/shop"
              className="flex w-full items-center justify-center border border-charcoal/20 py-3 text-xs tracking-[0.14em] text-charcoal uppercase transition-colors hover:border-charcoal hover:bg-charcoal/5"
            >
              <span>Continue Shopping</span>
            </Link>
          </div>

          <div className="mt-8 border-t border-border/60 pt-6">
            <p className="text-[0.6rem] font-semibold tracking-[0.18em] text-gold uppercase">
              Solure Guarantee
            </p>
            <p className="mt-1 text-xs text-muted">
              Authentic perfumes delivered directly to your doorstep in pristine luxury presentation.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
