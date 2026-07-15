import type { InputHTMLAttributes } from "react";

import { Input } from "@/components/ui/input";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label: string;
}

/** Labelled auth input with an announced validation message. */
export function FormField({ error, id, label, ...props }: FormFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-semibold tracking-[0.08em] uppercase">{label}</label>
      <Input id={id} error={Boolean(error)} aria-describedby={error ? errorId : undefined} {...props} />
      {error ? <p id={errorId} className="text-sm text-error" role="alert">{error}</p> : null}
    </div>
  );
}
