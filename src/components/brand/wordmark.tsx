import Link from "next/link";

import { cn } from "@/lib/utils/cn";

interface WordmarkProps {
  className?: string;
  inverse?: boolean;
}

/** Renders the canonical Solure Scents wordmark. */
export function Wordmark({ className, inverse = false }: WordmarkProps) {
  return (
    <Link
      href="/"
      aria-label="Solure Scents home"
      className={cn(
        "font-display text-2xl tracking-[0.16em] uppercase",
        inverse ? "text-pearl" : "text-charcoal",
        className,
      )}
    >
      Solure
    </Link>
  );
}
