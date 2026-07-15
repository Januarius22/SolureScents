import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = { title: "Create account", robots: { index: false, follow: false } };

export default function RegisterPage() {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Membership</p>
      <h1 className="mt-4 font-display text-5xl">Create your account</h1>
      <p className="mt-3 text-sm leading-6 text-muted">Save favourites, follow orders, and receive a more personal fragrance experience.</p>
      <div className="mt-8"><RegisterForm /></div>
      <p className="mt-8 text-center text-sm text-muted">Already registered? <Link href="/login" className="font-semibold text-charcoal underline-offset-4 hover:text-gold hover:underline">Sign in</Link></p>
    </div>
  );
}
