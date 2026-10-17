import { Database, Lock, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { requireApplicationAccess } from "@/features/auth/services/authorization";

export const metadata: Metadata = {
  title: "Platform Settings | Solure Scents Admin",
};

export default async function AdminSettingsPage() {
  const access = await requireApplicationAccess("admin");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-charcoal/10 pb-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
          Administration & Configuration
        </p>
        <h1 className="mt-2 font-display text-4xl text-charcoal sm:text-5xl">
          Platform Settings
        </h1>
        <p className="mt-2 text-sm text-muted">
          Operational preferences, security boundaries, and store configurations.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Store Profile */}
        <section className="border border-charcoal/10 bg-white p-6 shadow-soft">
          <div className="flex items-center gap-3 border-b border-charcoal/10 pb-4">
            <ShieldCheck size={20} className="text-gold" />
            <h2 className="font-display text-2xl text-charcoal">Commerce Identity</h2>
          </div>

          <div className="mt-5 space-y-4 text-xs">
            <div>
              <span className="font-semibold text-charcoal uppercase tracking-wider">Store Name</span>
              <p className="mt-1 text-sm text-muted">{siteConfig.name}</p>
            </div>
            <div>
              <span className="font-semibold text-charcoal uppercase tracking-wider">Tagline</span>
              <p className="mt-1 text-sm text-muted">{siteConfig.tagline}</p>
            </div>
            <div>
              <span className="font-semibold text-charcoal uppercase tracking-wider">Public Site URL</span>
              <p className="mt-1 font-mono text-sm text-muted">{siteConfig.url}</p>
            </div>
            <div>
              <span className="font-semibold text-charcoal uppercase tracking-wider">Default Currency</span>
              <p className="mt-1 font-mono text-sm text-muted">NGN (Nigerian Naira - Minor Units standard)</p>
            </div>
          </div>
        </section>

        {/* Security & Access Policies */}
        <section className="border border-charcoal/10 bg-white p-6 shadow-soft">
          <div className="flex items-center gap-3 border-b border-charcoal/10 pb-4">
            <Lock size={20} className="text-gold" />
            <h2 className="font-display text-2xl text-charcoal">Security & RBAC</h2>
          </div>

          <div className="mt-5 space-y-4 text-xs">
            <div>
              <span className="font-semibold text-charcoal uppercase tracking-wider">Current Admin Profile</span>
              <p className="mt-1 font-mono text-sm text-charcoal">{access.email}</p>
            </div>
            <div>
              <span className="font-semibold text-charcoal uppercase tracking-wider">Assigned Roles</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {access.roles.map((r) => (
                  <span key={r} className="rounded bg-charcoal/10 px-2 py-0.5 font-mono text-[0.62rem] text-charcoal uppercase">
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="font-semibold text-charcoal uppercase tracking-wider">Shopper Account Policy</span>
              <p className="mt-1 text-sm text-muted">
                Guest-first purchase enabled. End customers do not create passwords or accounts.
              </p>
            </div>
          </div>
        </section>

        {/* Database & Infrastructure */}
        <section className="border border-charcoal/10 bg-white p-6 shadow-soft lg:col-span-2">
          <div className="flex items-center gap-3 border-b border-charcoal/10 pb-4">
            <Database size={20} className="text-gold" />
            <h2 className="font-display text-2xl text-charcoal">Infrastructure & RLS Status</h2>
          </div>

          <div className="mt-5 grid gap-4 text-xs sm:grid-cols-3">
            <div className="border border-charcoal/10 p-4">
              <span className="font-semibold text-charcoal uppercase tracking-wider">Database Engine</span>
              <p className="mt-1 font-mono text-sm text-emerald-700">Supabase PostgreSQL 15</p>
              <p className="mt-1 text-[10px] text-muted">Row Level Security enabled across 18 tables</p>
            </div>
            <div className="border border-charcoal/10 p-4">
              <span className="font-semibold text-charcoal uppercase tracking-wider">Session Boundary</span>
              <p className="mt-1 font-mono text-sm text-emerald-700">Next.js 16 Request Proxy</p>
              <p className="mt-1 text-[10px] text-muted">SSR token refresh with cookie persistence</p>
            </div>
            <div className="border border-charcoal/10 p-4">
              <span className="font-semibold text-charcoal uppercase tracking-wider">Customer Communication</span>
              <p className="mt-1 font-mono text-sm text-emerald-700">Email Notifications</p>
              <p className="mt-1 text-[10px] text-muted">Order receipts & tracking sent to buyer emails</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
