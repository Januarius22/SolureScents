import { cn } from "@/lib/utils/cn";

interface AuthMessageProps {
  message?: string;
  status: "error" | "success";
}

/** Announces authentication outcomes without exposing sensitive provider errors. */
export function AuthMessage({ message, status }: AuthMessageProps) {
  if (!message) return null;

  return (
    <p
      className={cn(
        "border px-4 py-3 text-sm leading-6",
        status === "error" ? "border-error/30 bg-error/5 text-error" : "border-success/30 bg-success/5 text-success",
      )}
      role={status === "error" ? "alert" : "status"}
    >
      {message}
    </p>
  );
}
