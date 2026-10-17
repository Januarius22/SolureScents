"use client";

import { Mail, Menu, MessageCircle, Search, ShoppingBag, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Wordmark } from "@/components/brand/wordmark";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/discovery", label: "Scent Finder" },
  { href: "/shop", label: "Shop" },
  { href: "/collections", label: "Collections" },
  { href: "/brands", label: "Brands" },
  { href: "/journal", label: "Journal" },
  { href: "/contact", label: "Contact Us" },
] as const;

// Placeholder destinations: replace these when the brand accounts go live.
const contactLinks = {
  whatsapp: "https://wa.me/2348000000000",
  instagram: "https://www.instagram.com/solurescents/",
  email: "mailto:concierge@solurescents.com",
} as const;

function InstagramIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <rect height="18" rx="5" stroke="currentColor" strokeWidth="1.5" width="18" x="3" y="3" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17.4" cy="6.6" fill="currentColor" r="1" />
    </svg>
  );
}

function ContactIcons({ mobile = false }: { mobile?: boolean }) {
  const className = mobile
    ? "inline-flex size-11 items-center justify-center border transition-colors hover:border-gold hover:text-gold"
    : "inline-flex size-9 items-center justify-center transition-colors hover:text-gold";

  return (
    <div className={mobile ? "mt-6 flex items-center gap-2" : "hidden items-center lg:flex"} aria-label="Contact Solure" role="group">
      <a href={contactLinks.whatsapp} aria-label="Chat with Solure on WhatsApp" className={className} rel="noreferrer" target="_blank">
        <MessageCircle aria-hidden="true" size={18} strokeWidth={1.5} />
      </a>
      <a href={contactLinks.instagram} aria-label="Follow Solure on Instagram" className={className} rel="noreferrer" target="_blank">
        <InstagramIcon />
      </a>
      <a href={contactLinks.email} aria-label="Email the Solure concierge" className={className}>
        <Mail aria-hidden="true" size={18} strokeWidth={1.5} />
      </a>
    </div>
  );
}

/** Public-store navigation, intentionally isolated from all authenticated apps. */
export function StoreHeader() {
  const pathname = usePathname();

  const isActive = (href: (typeof navigation)[number]["href"]) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b bg-pearl/95 backdrop-blur-xl">
      <div className="bg-charcoal px-3 py-2 text-center text-[0.54rem] tracking-[0.1em] text-pearl uppercase sm:px-4 sm:text-[0.62rem] sm:tracking-[0.16em]">Complimentary consultation with every order</div>
      <div className="mx-auto flex h-20 max-w-[90rem] items-center justify-between px-5 sm:px-8 lg:px-12">
        <details className="relative xl:hidden">
          <summary className="flex size-11 cursor-pointer list-none items-center justify-center" aria-label="Open menu">
            <Menu aria-hidden="true" size={20} strokeWidth={1.5} />
          </summary>
          <nav className="absolute -left-5 top-14 w-screen border-b bg-pearl p-6 shadow-soft sm:-left-8 lg:-left-12" aria-label="Mobile store navigation">
            {navigation.map((item) => {
              const active = isActive(item.href);

              return <Link aria-current={active ? "page" : undefined} key={item.href} className={`block border-b py-4 text-sm tracking-[0.12em] uppercase transition-colors ${active ? "border-gold text-gold" : "hover:text-gold"}`} href={item.href}>{item.label}</Link>;
            })}
            <ContactIcons mobile />
          </nav>
        </details>
        <Wordmark />
        <nav aria-label="Store navigation" className="hidden items-center gap-6 xl:flex 2xl:gap-9">
          {navigation.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                key={item.href}
                href={item.href}
                className={`relative py-2 text-xs font-medium tracking-[0.13em] uppercase transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-gold after:transition-transform ${active ? "text-gold after:scale-x-100" : "after:scale-x-0 hover:text-gold hover:after:scale-x-100"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1">
          <ContactIcons />
          <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-charcoal/15 lg:block" />
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
