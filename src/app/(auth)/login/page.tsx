import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Admin Sign in", robots: { index: false, follow: false } };

interface LoginPageProps {
  searchParams: Promise<{ reason?: string }>;
}

const reasons: Record<string, string> = {
  account_unavailable: "This administrator account is currently unavailable. Contact your Super Administrator.",
  callback_failed: "That authentication link is invalid or has expired. Please try again.",
};

/** Secure sign-in for internal administrators and operations staff. */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { reason } = await searchParams;
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Internal Console</p>
      <h1 className="mt-4 font-display text-5xl">Administrator Sign in</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Restricted to Solure operations, inventory management, and fulfillment. Shoppers purchase directly without an account.
      </p>
      {reason && reasons[reason] ? (
        <p className="mt-6 border border-error/30 bg-error/5 p-4 text-sm text-error" role="alert">
          {reasons[reason]}
        </p>
      ) : null}
      <div className="mt-8"><LoginForm /></div>
      <div className="mt-8 border-t pt-6 text-center text-xs text-muted">
        <Link href="/" className="font-semibold text-charcoal underline-offset-4 hover:text-gold hover:underline">
          ← Return to Storefront
        </Link>
      </div>
    </div>
  );
}
