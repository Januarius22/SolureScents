import type { ReactNode } from "react";

export function AccountHeader({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <header className="mb-8"><p className="text-xs font-semibold tracking-[.18em] text-gold uppercase">{eyebrow}</p><h1 className="mt-2 font-display text-4xl text-charcoal">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{copy}</p></header>;
}
export function Panel({ children, title }: { children: ReactNode; title?: string }) {
  return <section className="border bg-white p-5 sm:p-6">{title && <h2 className="mb-5 font-display text-2xl">{title}</h2>}{children}</section>;
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="border border-dashed p-8 text-center text-sm text-muted">{children}</div>;
}
export function Money({ amount, currency }: { amount: number; currency: string }) {
  return <>{new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount / 100)}</>;
}
export const buttonClass = "inline-flex min-h-10 items-center justify-center bg-charcoal px-4 text-xs font-semibold tracking-[.1em] text-white uppercase hover:bg-gold";
export const inputClass = "min-h-11 w-full border bg-white px-3 text-sm outline-none focus:border-gold";
