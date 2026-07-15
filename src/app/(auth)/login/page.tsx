import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

interface LoginPageProps {
  searchParams: Promise<{ reason?: string }>;
}

const reasons: Record<string, string> = {
  account_unavailable: "This account is currently unavailable. Contact support if you believe this is an error.",
  callback_failed: "That authentication link is invalid or has expired. Please try again.",
};

/** Single sign-in page for customers, publishers, and administrators. */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { reason } = await searchParams;
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Welcome back</p>
      <h1 className="mt-4 font-display text-5xl">Sign in to Solure</h1>
      <p className="mt-3 text-sm leading-6 text-muted">One secure account, routed to the experience assigned to you.</p>
      {reason && reasons[reason] ? <p className="mt-6 border border-error/30 bg-error/5 p-4 text-sm text-error" role="alert">{reasons[reason]}</p> : null}
      <div className="mt-8"><LoginForm /></div>
      <p className="mt-8 text-center text-sm text-muted">New to Solure? <Link href="/register" className="font-semibold text-charcoal underline-offset-4 hover:text-gold hover:underline">Create an account</Link></p>
    </div>
  );
}
