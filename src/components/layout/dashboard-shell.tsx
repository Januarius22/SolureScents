"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  Boxes,
  CalendarClock,
  CreditCard,
  FilePenLine,
  Files,
  FolderTree,
  Gift,
  Heart,
  House,
  Image,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  SearchCheck,
  Settings,
  ShoppingCart,
  Star,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";

import { Wordmark } from "@/components/brand/wordmark";
import { logoutAction } from "@/features/auth/actions/auth";

const ICON_MAP: Record<string, LucideIcon> = {
  BarChart3,
  Bell,
  Boxes,
  CalendarClock,
  CreditCard,
  FilePenLine,
  Files,
  FolderTree,
  Gift,
  Heart,
  House,
  Image,
  LayoutDashboard,
  MapPin,
  Package,
  SearchCheck,
  Settings,
  ShoppingCart,
  Star,
  UserRound,
  Users,
};

function resolveNavIcon(icon: string | LucideIcon): LucideIcon {
  if (typeof icon === "function" || (typeof icon === "object" && icon !== null)) {
    return icon as LucideIcon;
  }
  return ICON_MAP[icon] ?? LayoutDashboard;
}

export interface DashboardNavItem {
  href: string;
  icon: string | LucideIcon;
  label: string;
}

interface DashboardShellProps {
  appName: string;
  children: ReactNode;
  navigation: readonly DashboardNavItem[];
  userEmail: string;
}

/** Structural shell shared by internal apps with responsive drawer and active link styling. */
export function DashboardShell({ appName, children, navigation, userEmail }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);

  const closeDrawer = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-[#f8f7f4] lg:grid lg:grid-cols-[18rem_1fr]">
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden border-r border-charcoal/20 bg-charcoal px-6 py-8 text-pearl lg:flex lg:flex-col lg:justify-between">
        <div>
          <Wordmark inverse />
          <div className="mt-3 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-champagne" aria-hidden="true" />
            <p className="text-[0.62rem] font-semibold tracking-[0.2em] text-champagne uppercase">
              {appName} Console
            </p>
          </div>

          <nav aria-label={`${appName} navigation`} className="mt-10 space-y-1.5">
            {navigation.map(({ href, icon, label }) => {
              const Icon = resolveNavIcon(icon);
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3.5 rounded-sm px-3.5 text-xs font-medium tracking-[0.08em] transition-all duration-200 ${
                    active
                      ? "bg-white/12 text-champagne shadow-sm font-semibold border-l-2 border-champagne"
                      : "text-ivory/70 hover:bg-white/6 hover:text-white"
                  }`}
                >
                  <Icon aria-hidden="true" size={17} strokeWidth={active ? 2 : 1.5} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info and Sign Out */}
        <div className="border-t border-white/10 pt-6">
          <div className="mb-4">
            <p className="text-[0.6rem] font-semibold tracking-wider text-pearl/50 uppercase">
              Active Administrator
            </p>
            <p className="truncate text-xs text-ivory/90" title={userEmail}>
              {userEmail}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              className="group flex w-full items-center justify-between border border-white/15 px-3 py-2 text-[0.65rem] font-semibold tracking-[0.14em] text-pearl uppercase transition-colors hover:border-champagne hover:bg-white/5 hover:text-champagne"
              type="submit"
            >
              <span>Sign out</span>
              <LogOut size={13} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-col">
        {/* Top Bar Header */}
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-charcoal/10 bg-white/95 px-5 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-4">
            {/* Mobile Sidebar Trigger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open administration navigation"
              className="flex size-10 items-center justify-center rounded-sm border border-charcoal/15 text-charcoal lg:hidden"
            >
              <Menu size={18} strokeWidth={1.5} />
            </button>

            <div>
              <p className="text-[0.6rem] font-semibold tracking-[0.2em] text-gold uppercase">
                Solure Commerce Operations
              </p>
              <p className="font-display text-2xl tracking-tight text-charcoal">{appName}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              target="_blank"
              className="hidden text-xs font-semibold tracking-wider text-charcoal/70 uppercase underline-offset-4 hover:text-gold hover:underline sm:inline-block"
            >
              View Storefront ↗
            </Link>

            <span className="hidden h-5 w-px bg-charcoal/15 sm:block" aria-hidden="true" />

            <div className="hidden text-right text-xs sm:block">
              <span className="block text-muted">{userEmail}</span>
            </div>

            <form action={logoutAction}>
              <button
                className="border border-charcoal/20 px-3.5 py-1.5 text-[0.62rem] font-semibold tracking-[0.12em] text-charcoal uppercase transition-colors hover:border-gold hover:bg-gold/10 hover:text-gold"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-5 sm:p-8 lg:p-10">{children}</main>
      </div>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              aria-hidden="true"
              className="fixed inset-0 z-40 bg-charcoal/60 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between bg-charcoal p-6 text-pearl shadow-2xl"
            >
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <Wordmark inverse />
                  <button
                    type="button"
                    onClick={closeDrawer}
                    aria-label="Close navigation"
                    className="flex size-9 items-center justify-center rounded-sm text-pearl/70 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <nav aria-label="Mobile admin navigation" className="mt-8 space-y-1">
                  {navigation.map(({ href, icon, label }) => {
                    const Icon = resolveNavIcon(icon);
                    const active = isActive(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={closeDrawer}
                        className={`flex min-h-11 items-center gap-3.5 rounded-sm px-3.5 text-xs font-medium tracking-[0.08em] transition-colors ${
                          active
                            ? "bg-white/12 text-champagne font-semibold border-l-2 border-champagne"
                            : "text-ivory/70 hover:bg-white/6 hover:text-white"
                        }`}
                      >
                        <Icon size={17} strokeWidth={active ? 2 : 1.5} />
                        <span>{label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="border-t border-white/10 pt-5">
                <p className="truncate text-xs text-ivory/60">{userEmail}</p>
                <form action={logoutAction} className="mt-3">
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 border border-white/20 py-2.5 text-xs font-semibold tracking-wider text-pearl uppercase hover:border-champagne hover:text-champagne"
                  >
                    <LogOut size={14} />
                    <span>Sign out</span>
                  </button>
                </form>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
