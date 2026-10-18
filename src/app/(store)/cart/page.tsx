import type { Metadata } from "next";
import { CartView } from "@/features/cart/components/cart-view";

export const metadata: Metadata = {
  title: "Shopping Bag — Solure Scents",
  description: "Review your curated fragrance selection and proceed to secure checkout.",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartView />;
}
