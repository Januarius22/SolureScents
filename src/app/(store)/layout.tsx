import type { ReactNode } from "react";

import { StoreFooter } from "@/components/layout/store-footer";
import { StoreHeader } from "@/components/layout/store-header";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { CartProvider } from "@/features/cart/context/cart-context";
import { CartDrawer } from "@/features/cart/components/cart-drawer";
import { getActiveCart } from "@/features/cart/services/cart-service";

/** Layout boundary for the public commerce experience with global guest shopping bag. */
export default async function StoreLayout({ children }: Readonly<{ children: ReactNode }>) {
  const initialCart = await getActiveCart();

  return (
    <CartProvider initialCart={initialCart}>
      <div className="flex min-h-screen flex-col">
        <StoreHeader />
        <main className="flex-1">{children}</main>
        <StoreFooter />
        <ScrollToTop />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
