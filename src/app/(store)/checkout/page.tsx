import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag, ArrowLeft, ShieldCheck } from "lucide-react";
import { getActiveCart } from "@/features/cart/services/cart-service";
import { CheckoutForm } from "@/features/checkout/components/checkout-form";
import { buttonStyles } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Guest Checkout | Solure Scents",
  description: "Secure, registration-free luxury fragrance checkout for Nigeria.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const cart = await getActiveCart();

  // If bag is empty, render the elegant empty-bag state
  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-28 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 text-gold">
          <ShoppingBag size={28} />
        </div>
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-gold uppercase">
          Your Shopping Bag is Empty
        </p>
        <h1 className="mt-3 font-display text-4xl text-charcoal sm:text-5xl">
          Begin Your Fragrance Journey
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">
          Your bag currently contains no selected flacons. Browse our curated collection of luxury perfumes to begin checkout.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/shop" className={buttonStyles("primary")}>
            Explore Fragrances
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory/40 pb-24 pt-12 sm:pt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb & Back Link */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/cart"
            className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted uppercase transition-colors hover:text-gold"
          >
            <ArrowLeft size={14} />
            <span>Return to bag</span>
          </Link>

          <div className="flex items-center gap-2 text-xs text-muted">
            <ShieldCheck size={14} className="text-gold" />
            <span>Encrypted Guest Checkout</span>
          </div>
        </div>

        {/* Page Header */}
        <div className="mb-10 text-center sm:text-left">
          <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase">
            Solure Private Boutique
          </p>
          <h1 className="mt-2 font-display text-4xl text-charcoal sm:text-5xl">
            Secure Guest Checkout
          </h1>
          <p className="mt-2 max-w-2xl text-xs sm:text-sm text-muted">
            Complete your delivery details for nationwide fragrance dispatch. No registration or password required.
          </p>
        </div>

        {/* Guest Checkout Interactive Form */}
        <CheckoutForm cart={cart} />
      </div>
    </div>
  );
}
