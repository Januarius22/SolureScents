import type { ReactNode } from "react";

import { StoreFooter } from "@/components/layout/store-footer";
import { StoreHeader } from "@/components/layout/store-header";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

/** Layout boundary for the public commerce experience only. */
export default function StoreLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <StoreHeader />
      <main className="flex-1">{children}</main>
      <StoreFooter />
      <ScrollToTop />
    </div>
  );
}

