import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-charcoal bg-charcoal text-pearl hover:border-gold hover:bg-gold",
  secondary:
    "border-charcoal bg-transparent text-charcoal hover:bg-charcoal hover:text-pearl",
  ghost: "border-transparent bg-transparent text-charcoal hover:bg-ivory",
};

/** Returns the canonical classes for button-like controls and links. */
export function buttonStyles(
  variant: ButtonVariant = "primary",
  className?: string,
): string {
  return cn(
    "inline-flex min-h-11 items-center justify-center border px-6 text-xs font-semibold tracking-[0.14em] uppercase transition-colors disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    className,
  );
}

/** An accessible button with consistent brand treatments. */
export function Button({
  className,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonStyles(variant, className)}
      type={type}
      {...props}
    />
  );
}
