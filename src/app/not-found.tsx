import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";

/** Branded fallback for unknown routes. */
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5 text-center">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">404 · Lost note</p>
        <h1 className="mt-5 font-display text-6xl">This trail ends here.</h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-muted">The page you were looking for has moved or no longer exists.</p>
        <Link href="/" className={buttonStyles("primary", "mt-8")}>Return home</Link>
      </div>
    </main>
  );
}
