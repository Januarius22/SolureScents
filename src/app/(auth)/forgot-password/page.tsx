import type { Metadata } from "next";
import Link from "next/link";

import { RecoveryForm } from "@/features/auth/components/recovery-form";

export const metadata: Metadata = { title: "Recover account", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Account recovery</p>
      <h1 className="mt-4 font-display text-5xl">Reset your password</h1>
      <p className="mt-3 text-sm leading-6 text-muted">Enter your email and we will send secure recovery instructions.</p>
      <div className="mt-8"><RecoveryForm /></div>
      <p className="mt-8 text-center text-sm"><Link href="/login" className="font-semibold underline-offset-4 hover:text-gold hover:underline">Return to sign in</Link></p>
    </div>
  );
}
