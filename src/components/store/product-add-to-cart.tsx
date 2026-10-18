"use client";

import { useState } from "react";
import { Check, Loader2, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/features/cart/context/cart-context";
import { formatMoney } from "@/lib/utils/money";

interface Variant {
  id: string;
  label: string;
  size_ml: number;
  price_minor: number;
  compare_at_price_minor?: number | null;
  currency: string;
}

interface ProductAddToCartProps {
  variants: Variant[];
  productName: string;
}

export function ProductAddToCart({ variants, productName }: ProductAddToCartProps) {
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const { addItem, isPending, error, clearError } = useCart();

  const activeVariant = variants.find((v) => v.id === selectedVariantId) ?? variants[0];

  const handleAddToCart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVariant || isPending) return;

    clearError();
    const success = await addItem(activeVariant.id, quantity);
    if (success) {
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2000);
    }
  };

  if (!variants.length || !activeVariant) {
    return (
      <div className="mt-8 border border-dashed border-border/80 p-5 text-sm text-muted">
        This composition is currently unavailable.
      </div>
    );
  }

  return (
    <form onSubmit={handleAddToCart} className="mt-8 space-y-6">
      {/* Hidden inputs for non-JS progressive enhancement */}
      <input type="hidden" name="variantId" value={activeVariant.id} />
      <input type="hidden" name="quantity" value={quantity} />

      {/* Bottle Size Selector */}
      <fieldset>
        <div className="flex items-center justify-between">
          <legend className="text-xs font-semibold tracking-[0.14em] text-charcoal uppercase">
            Select Flacon Size
          </legend>
          {activeVariant && (
            <span className="text-xs text-muted">
              {activeVariant.size_ml} ml Eau de Parfum
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          {variants.map((variant) => {
            const isSelected = variant.id === activeVariant.id;

            return (
              <button
                type="button"
                key={variant.id}
                onClick={() => {
                  setSelectedVariantId(variant.id);
                  clearError();
                }}
                className={`flex flex-col items-start border p-3 text-left transition-all sm:min-w-[130px] ${
                  isSelected
                    ? "border-charcoal bg-charcoal text-pearl shadow-sm"
                    : "border-border/80 bg-pearl/60 text-charcoal hover:border-gold/60"
                }`}
              >
                <span className="text-xs font-medium tracking-wider uppercase">
                  {variant.label}
                </span>
                <span
                  className={`mt-1 text-xs font-semibold ${
                    isSelected ? "text-champagne" : "text-charcoal"
                  }`}
                >
                  {formatMoney(variant.price_minor, variant.currency)}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Quantity & Add to Bag Controls */}
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          {/* Quantity Selector */}
          <div className="flex items-center border border-charcoal/20 bg-pearl">
            <button
              type="button"
              disabled={isPending || quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
              className="flex size-11 items-center justify-center text-charcoal transition-colors hover:bg-charcoal/5 disabled:opacity-30"
            >
              <Minus size={14} />
            </button>

            <span className="min-w-10 text-center font-display text-sm font-semibold text-charcoal">
              {quantity}
            </span>

            <button
              type="button"
              disabled={isPending || quantity >= 99}
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              aria-label="Increase quantity"
              className="flex size-11 items-center justify-center text-charcoal transition-colors hover:bg-charcoal/5 disabled:opacity-30"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Add to Bag CTA */}
          <button
            type="submit"
            disabled={isPending}
            aria-label={`Add ${productName} (${activeVariant.label}) to shopping bag`}
            className={`flex flex-1 items-center justify-center gap-2 border py-3.5 text-xs font-semibold tracking-[0.16em] uppercase transition-all ${
              isSuccess
                ? "border-gold bg-gold text-charcoal"
                : "border-charcoal bg-charcoal text-pearl hover:border-gold hover:bg-gold hover:text-charcoal"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Adding to Bag...</span>
              </>
            ) : isSuccess ? (
              <>
                <Check size={16} />
                <span>Added to Bag</span>
              </>
            ) : (
              <>
                <ShoppingBag size={16} strokeWidth={1.5} />
                <span>
                  Add to Bag · {formatMoney(activeVariant.price_minor * quantity, activeVariant.currency)}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Real-time error message */}
        {error && (
          <p className="rounded-sm border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
