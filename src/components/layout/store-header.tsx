"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mail, Menu, MessageCircle, Search, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Wordmark } from "@/components/brand/wordmark";
import { useCart } from "@/features/cart/context/cart-context";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/discovery", label: "Scent Finder" },
  { href: "/shop", label: "Shop" },
  { href: "/collections", label: "Collections" },
  { href: "/contact", label: "Contact Us" },
] as const;

const contactLinks = {
  whatsapp: "https://wa.me/2347082189621",
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

function ContactIcons({
  mobile = false,
  onItemClick,
}: {
  mobile?: boolean;
  onItemClick?: () => void;
}) {
  const className = mobile
    ? "inline-flex size-11 items-center justify-center border border-charcoal/20 bg-pearl transition-colors hover:border-gold hover:text-gold"
    : "inline-flex size-9 items-center justify-center transition-colors hover:text-gold";

  return (
    <div
      className={mobile ? "mt-7 flex items-center gap-3" : "hidden items-center lg:flex"}
      aria-label="Contact Solure"
      role="group"
    >
      <a
        href={contactLinks.whatsapp}
        aria-label="Chat with Solure on WhatsApp"
        className={className}
        rel="noreferrer"
        target="_blank"
        onClick={onItemClick}
      >
        <MessageCircle aria-hidden="true" size={18} strokeWidth={1.5} />
      </a>
      <a
        href={contactLinks.instagram}
        aria-label="Follow Solure on Instagram"
        className={className}
        rel="noreferrer"
        target="_blank"
        onClick={onItemClick}
      >
        <InstagramIcon />
      </a>
      <a
        href={contactLinks.email}
        aria-label="Email the Solure concierge"
        className={className}
        onClick={onItemClick}
      >
        <Mail aria-hidden="true" size={18} strokeWidth={1.5} />
      </a>
    </div>
  );
}

/** Public-store navigation with auto-closing mobile menu on scroll, route changes, and outside clicks. */
export function StoreHeader() {
  const pathname = usePathname();
  const { openCart, cart } = useCart();
  const itemCount = cart?.itemCount ?? 0;
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (href: (typeof navigation)[number]["href"]) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const closeMenu = () => setIsOpen(false);

  // Automatically close mobile menu when pathname changes (React recommended render-time adjustment)
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  // Handle scroll behavior: update header elevation and auto-close mobile drawer on scroll
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 18);

      // Auto-close menu if open and user scrolls more than 12px
      if (Math.abs(currentScrollY - lastScrollY) > 12) {
        setIsOpen(false);
        lastScrollY = currentScrollY;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
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

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-shadow duration-300 bg-pearl/95 backdrop-blur-xl ${
        isScrolled ? "shadow-[0_8px_30px_rgba(29,27,25,0.06)] border-charcoal/10" : "border-border/60"
      }`}
    >
      <div className="bg-charcoal px-3 py-1.5 text-center text-[0.52rem] tracking-[0.1em] text-pearl uppercase sm:px-4 sm:text-[0.6rem] sm:tracking-[0.16em]">
        Complimentary consultation with every order
      </div>

      <div className="mx-auto flex h-16 sm:h-[4.25rem] max-w-[90rem] items-center justify-between px-5 sm:px-8 lg:px-12">
        {/* Mobile menu trigger */}
        <div className="xl:hidden">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-controls="mobile-store-nav"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            className="flex size-11 items-center justify-center rounded-sm transition-colors hover:bg-charcoal/5"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isOpen ? (
                <motion.span
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center text-gold"
                >
                  <X aria-hidden="true" size={22} strokeWidth={1.5} />
                </motion.span>
              ) : (
                <motion.span
                  key="menu"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center text-charcoal"
                >
                  <Menu aria-hidden="true" size={22} strokeWidth={1.5} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        <Wordmark />

        {/* Desktop Navigation */}
        <nav aria-label="Store navigation" className="hidden items-center gap-6 xl:flex 2xl:gap-9">
          {navigation.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                key={item.href}
                href={item.href}
                className={`relative py-2 text-xs font-medium tracking-[0.13em] uppercase transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-gold after:transition-transform ${
                  active
                    ? "text-gold after:scale-x-100"
                    : "after:scale-x-0 hover:text-gold hover:after:scale-x-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <ContactIcons />
          <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-charcoal/15 lg:block" />
          <Link
            href="/search"
            aria-label="Search fragrances"
            className="size-11 inline-flex items-center justify-center transition-colors hover:text-gold"
          >
            <Search aria-hidden="true" size={19} strokeWidth={1.5} />
          </Link>
          <button
            type="button"
            onClick={openCart}
            aria-label={`Shopping bag with ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            className="relative inline-flex size-11 items-center justify-center transition-colors hover:text-gold"
          >
            <ShoppingBag aria-hidden="true" size={19} strokeWidth={1.5} />
            {itemCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-gold text-[0.55rem] font-bold text-charcoal">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Animated Mobile Navigation Drawer & Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <div ref={menuRef} className="xl:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={closeMenu}
              aria-hidden="true"
              className="fixed inset-0 top-[calc(4rem+1.6rem)] sm:top-[calc(4.25rem+1.6rem)] z-40 bg-charcoal/45 backdrop-blur-sm"
            />

            {/* Menu Panel */}
            <motion.nav
              id="mobile-store-nav"
              aria-label="Mobile store navigation"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-0 top-[calc(4rem+1.6rem)] sm:top-[calc(4.25rem+1.6rem)] z-50 max-h-[calc(100svh-6rem)] overflow-y-auto border-b border-charcoal/15 bg-pearl p-6 shadow-2xl sm:p-8"
            >
              <div className="flex items-center justify-between border-b pb-4">
                <span className="text-[0.62rem] font-semibold tracking-[0.24em] text-gold uppercase">
                  Menu · Navigation
                </span>
                <span className="text-[0.62rem] tracking-[0.16em] text-muted uppercase">
                  Solure Scents
                </span>
              </div>

              <div className="divide-y divide-border/60">
                {navigation.map((item) => {
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center justify-between py-4 text-sm font-medium tracking-[0.14em] uppercase transition-colors ${
                        active ? "text-gold font-semibold" : "text-charcoal hover:text-gold"
                      }`}
                    >
                      <span>{item.label}</span>
                      {active && <span className="size-1.5 rounded-full bg-gold" aria-hidden="true" />}
                    </Link>
                  );
                })}
              </div>

              {/* Mobile Quick Action Button: Search */}
              <div className="mt-6 border-t pt-6 sm:hidden">
                <Link
                  href="/search"
                  onClick={closeMenu}
                  className="flex w-full items-center justify-center gap-2 border border-charcoal/20 py-3 text-xs tracking-[0.12em] uppercase transition-colors hover:border-gold hover:text-gold"
                >
                  <Search aria-hidden="true" size={15} />
                  <span>Search Fragrances</span>
                </Link>
              </div>

              {/* Contact and Concierge info */}
              <div className="mt-8 border-t pt-6">
                <p className="text-[0.6rem] font-semibold tracking-[0.2em] text-gold uppercase">
                  Concierge assistance
                </p>
                <p className="mt-1 text-xs text-muted">
                  Private consultations available Monday to Saturday.
                </p>
                <ContactIcons mobile onItemClick={closeMenu} />
              </div>
            </motion.nav>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}

