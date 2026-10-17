import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Staff Provisioning", robots: { index: false, follow: false } };

export default function RegisterPage() {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Staff Access</p>
      <h1 className="mt-4 font-display text-4xl">Admin Portal</h1>
      <p className="mt-4 text-sm leading-6 text-muted">
        Public customer registration is disabled. Shoppers purchase directly without an account and receive order confirmation and courier tracking via email.
      </p>
      <div className="mt-8 border border-charcoal/15 bg-pearl p-6">
        <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">Staff Access Policy</p>
        <p className="mt-2 text-xs leading-5 text-muted">
          New administrative, inventory, or operational staff accounts must be provisioned directly by a Super Administrator.
        </p>
      </div>
      <div className="mt-8 flex flex-col gap-3 text-center text-sm">
        <Link href="/login" className="font-semibold text-charcoal underline-offset-4 hover:text-gold hover:underline">
          Go to Administrator Sign in →
        </Link>
        <Link href="/" className="text-xs text-muted hover:text-charcoal">
          Return to Storefront
        </Link>
      </div>
    </div>
  );
}
