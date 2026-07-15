import { Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";

const navigation = [
  { href: "/shop", label: "Shop" },
  { href: "/collections", label: "Collections" },
  { href: "/brands", label: "Brands" },
  { href: "/journal", label: "Journal" },
] as const;

/** Public-store navigation, intentionally isolated from all authenticated apps. */
export function StoreHeader() {
  return (
    <header className="border-b bg-pearl/95">
      <div className="mx-auto flex h-20 max-w-[90rem] items-center justify-between px-5 sm:px-8 lg:px-12">
        <button className="inline-flex size-11 items-center justify-center lg:hidden" aria-label="Open menu" type="button">
          <Menu aria-hidden="true" size={20} strokeWidth={1.5} />
        </button>
        <Wordmark />
        <nav aria-label="Store navigation" className="hidden items-center gap-9 lg:flex">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="text-xs font-medium tracking-[0.13em] uppercase transition-colors hover:text-gold">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <Link href="/search" aria-label="Search" className="hidden size-11 items-center justify-center sm:inline-flex">
            <Search aria-hidden="true" size={19} strokeWidth={1.5} />
          </Link>
          <Link href="/account" aria-label="Your account" className="hidden size-11 items-center justify-center sm:inline-flex">
            <UserRound aria-hidden="true" size={19} strokeWidth={1.5} />
          </Link>
          <Link href="/cart" aria-label="Shopping bag" className="inline-flex size-11 items-center justify-center">
            <ShoppingBag aria-hidden="true" size={19} strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </header>
  );
}
