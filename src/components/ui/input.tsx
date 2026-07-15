import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

/** Accessible text input with consistent error and focus treatments. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error = false, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={error}
      className={cn(
        "min-h-12 w-full border bg-white px-4 text-sm text-charcoal transition-colors placeholder:text-muted/65 focus:border-gold focus:outline-none",
        error && "border-error",
        className,
      )}
      {...props}
    />
  );
});
