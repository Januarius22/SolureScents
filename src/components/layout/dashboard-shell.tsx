import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/brand/wordmark";

export interface DashboardNavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

interface DashboardShellProps {
  appName: string;
  children: ReactNode;
  navigation: readonly DashboardNavItem[];
}

/** Structural shell shared by internal apps; each app supplies isolated navigation and authorization. */
export function DashboardShell({ appName, children, navigation }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-[#f7f6f2] lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="hidden border-r bg-charcoal px-6 py-8 text-pearl lg:flex lg:flex-col">
        <Wordmark inverse />
        <p className="mt-3 text-[0.65rem] tracking-[0.18em] text-champagne uppercase">{appName}</p>
        <nav aria-label={`${appName} navigation`} className="mt-12 space-y-1">
          {navigation.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} className="flex min-h-11 items-center gap-3 px-3 text-sm text-ivory/75 transition-colors hover:bg-white/8 hover:text-white">
              <Icon aria-hidden="true" size={17} strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex h-18 items-center justify-between border-b bg-surface px-5 sm:px-8">
          <div>
            <p className="text-[0.65rem] tracking-[0.16em] text-muted uppercase">Solure Scents</p>
            <p className="font-display text-xl">{appName}</p>
          </div>
          <button className="size-9 rounded-full bg-ivory" aria-label="Open user menu" type="button" />
        </header>
        <main className="p-5 sm:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
