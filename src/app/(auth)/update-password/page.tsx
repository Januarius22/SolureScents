import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";
import { getCurrentUserAccess } from "@/features/auth/services/authorization";

export const metadata: Metadata = { title: "Choose new password", robots: { index: false, follow: false } };

export default async function UpdatePasswordPage() {
  const access = await getCurrentUserAccess();
  if (!access) redirect("/forgot-password");

  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Account recovery</p>
      <h1 className="mt-4 font-display text-5xl">Choose a new password</h1>
      <p className="mt-3 text-sm leading-6 text-muted">Use at least ten characters with uppercase, lowercase, and a number.</p>
      <div className="mt-8"><UpdatePasswordForm /></div>
    </div>
  );
}
