"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowRight, Loader2, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/features/cart/context/cart-context";
import { ProductVisual } from "@/components/store/product-visual";
import { formatMoney } from "@/lib/utils/money";

export function CartDrawer() {
  const {
    cart,
    isOpen,
    isPending,
    pendingItemId,
    error,
    closeCart,
    updateQuantity,
    removeItem,
    clearError,
  } = useCart();

  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeCart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeCart]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const items = cart?.items ?? [];
  const itemCount = cart?.itemCount ?? 0;
  const subtotalMinor = cart?.subtotalMinor ?? 0;
  const currency = cart?.currency ?? "NGN";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeCart}
            aria-hidden="true"
            className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm"
          />

          {/* Sliding Panel */}
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-6">
            <motion.aside
              ref={drawerRef}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex w-screen max-w-md flex-col border-l border-border/80 bg-pearl shadow-2xl"
              aria-label="Shopping bag"
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="flex h-20 items-center justify-between border-b border-border/70 px-6 sm:px-8">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-gold/10 text-gold">
                    <ShoppingBag size={18} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="font-display text-xl text-charcoal">Shopping Bag</h2>
                    <p className="text-[0.62rem] tracking-[0.16em] text-muted uppercase">
                      {itemCount} {itemCount === 1 ? "Composition" : "Compositions"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeCart}
                  aria-label="Close shopping bag"
                  className="flex size-10 items-center justify-center rounded-sm text-charcoal/70 transition-colors hover:bg-charcoal/5 hover:text-charcoal"
                >
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>

              {/* Error notice */}
              {error && (
                <div className="flex items-start justify-between gap-3 border-b border-red-200 bg-red-50/80 px-6 py-3 text-xs text-red-800">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0 text-red-600" />
                    <span>{error}</span>
                  </div>
                  <button
                    type="button"
                    onClick={clearError}
                    aria-label="Dismiss error"
                    className="text-red-600 hover:text-red-900"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                {items.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                    <div className="relative mb-6 size-28 overflow-hidden rounded-full border border-champagne/40 bg-sand/30 p-4">
                      <ProductVisual label="Solure" className="size-full" />
                    </div>
                    <p className="text-[0.62rem] font-semibold tracking-[0.24em] text-gold uppercase">
                      Your bag is silent
                    </p>
                    <h3 className="mt-2 font-display text-2xl text-charcoal">
                      Your fragrance journey begins here.
                    </h3>
                    <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted">
                      Discover exceptional extrait de parfum and artisanal flacons crafted for lasting presence.
                    </p>
                    <Link
                      href="/shop"
                      onClick={closeCart}
                      className="mt-8 inline-flex items-center gap-2 border border-charcoal bg-charcoal px-7 py-3 text-xs font-medium tracking-[0.16em] text-pearl uppercase transition-all hover:border-gold hover:bg-gold"
                    >
                      <span>Explore Fragrances</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/60" role="list">
                    {items.map((item) => {
                      const isItemPending = isPending && pendingItemId === item.id;

                      return (
                        <li key={item.id} className="py-5">
                          <div className="flex gap-4">
                            {/* Flacon Visual */}
                            <div className="relative size-20 shrink-0 overflow-hidden border border-border/80 bg-sand/20">
                              <ProductVisual label={item.productName.slice(0, 8)} className="size-full" />
                            </div>

                            {/* Details */}
                            <div className="flex flex-1 flex-col">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[0.55rem] font-semibold tracking-[0.16em] text-gold uppercase">
                                    {item.concentration}
                                  </span>
                                  <h4 className="font-display text-base leading-snug text-charcoal">
                                    <Link
                                      href={`/shop/${item.productSlug}`}
                                      onClick={closeCart}
                                      className="transition-colors hover:text-gold"
                                    >
                                      {item.productName}
                                    </Link>
                                  </h4>
                                  <p className="mt-0.5 text-xs text-muted">
                                    {item.variantLabel}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  disabled={isItemPending}
                                  onClick={() => removeItem(item.id)}
                                  aria-label={`Remove ${item.productName} from bag`}
                                  className="text-muted/60 transition-colors hover:text-red-700 disabled:opacity-40"
                                >
                                  {isItemPending ? (
                                    <Loader2 size={15} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={15} strokeWidth={1.5} />
                                  )}
                                </button>
                              </div>

                              {/* Price & Quantity Controls */}
                              <div className="mt-4 flex items-center justify-between">
                                <div className="flex items-center border border-charcoal/20 bg-white">
                                  <button
                                    type="button"
                                    disabled={isItemPending || item.quantity <= 1}
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    aria-label={`Decrease quantity of ${item.productName}`}
                                    className="flex size-7 items-center justify-center text-charcoal transition-colors hover:bg-charcoal/5 disabled:opacity-30"
                                  >
                                    <Minus size={12} />
                                  </button>

                                  <span className="min-w-8 text-center text-xs font-medium text-charcoal">
                                    {isItemPending ? (
                                      <Loader2 size={11} className="mx-auto animate-spin text-muted" />
                                    ) : (
                                      item.quantity
                                    )}
                                  </span>

                                  <button
                                    type="button"
                                    disabled={isItemPending || item.quantity >= 99}
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    aria-label={`Increase quantity of ${item.productName}`}
                                    className="flex size-7 items-center justify-center text-charcoal transition-colors hover:bg-charcoal/5 disabled:opacity-30"
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>

                                <div className="text-right">
                                  <p className="text-xs font-semibold text-charcoal">
                                    {formatMoney(item.lineTotalMinor, item.currency)}
                                  </p>
                                  {item.quantity > 1 && (
                                    <p className="text-[0.6rem] text-muted">
                                      {formatMoney(item.unitPriceMinor, item.currency)} each
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div className="border-t border-border/80 bg-pearl/90 p-6 sm:px-8">
                  <div className="mb-4 rounded-sm border border-border/80 bg-sand/30 px-3 py-2 text-center text-[0.62rem] tracking-[0.14em] text-muted uppercase">
                    Delivery options and fees are calculated at checkout.
                  </div>

                  <div className="space-y-2 border-b border-border/60 pb-4 text-xs">
                    <div className="flex justify-between text-muted">
                      <span>Subtotal</span>
                      <span className="font-medium text-charcoal">
                        {formatMoney(subtotalMinor, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>Delivery</span>
                      <span>Calculated at checkout</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-base">
                    <span className="font-display text-charcoal">Estimated Total</span>
                    <strong className="font-display text-xl text-charcoal">
                      {formatMoney(subtotalMinor, currency)}
                    </strong>
                  </div>

                  <div className="mt-6 space-y-2">
                    <Link
                      href="/checkout"
                      onClick={closeCart}
                      className="flex w-full items-center justify-center gap-2 border border-charcoal bg-charcoal py-3.5 text-xs font-semibold tracking-[0.16em] text-pearl uppercase transition-all hover:border-gold hover:bg-gold"
                    >
                      <span>Proceed to Checkout</span>
                      <ArrowRight size={14} />
                    </Link>

                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/cart"
                        onClick={closeCart}
                        className="flex items-center justify-center border border-charcoal/20 py-2.5 text-[0.65rem] font-medium tracking-[0.14em] text-charcoal uppercase transition-colors hover:border-charcoal hover:bg-charcoal/5"
                      >
                        View Full Bag
                      </Link>
                      <button
                        type="button"
                        onClick={closeCart}
                        className="flex items-center justify-center border border-charcoal/20 py-2.5 text-[0.65rem] font-medium tracking-[0.14em] text-charcoal uppercase transition-colors hover:border-charcoal hover:bg-charcoal/5"
                      >
                        Continue Browsing
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.aside>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
