"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label: string;
  showPasswordToggle?: boolean;
}

/** Labelled auth input with an announced validation message and password visibility toggle. */
export function FormField({
  error,
  id,
  label,
  type = "text",
  showPasswordToggle,
  className,
  ...props
}: FormFieldProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const errorId = `${id}-error`;

  const isPassword = type === "password" || showPasswordToggle === true;
  const computedType = isPassword && isRevealed ? "text" : type;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-semibold tracking-[0.08em] uppercase">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={computedType}
          error={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(isPassword && "pr-11", className)}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setIsRevealed((prev) => !prev)}
            aria-label={isRevealed ? "Hide password" : "Show password"}
            title={isRevealed ? "Hide password" : "Show password"}
            className="absolute right-0 top-0 flex h-12 w-11 items-center justify-center text-muted transition-colors hover:text-charcoal focus:text-gold focus:outline-none"
            tabIndex={-1}
          >
            {isRevealed ? (
              <EyeOff size={18} className="stroke-[1.75]" />
            ) : (
              <Eye size={18} className="stroke-[1.75]" />
            )}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

