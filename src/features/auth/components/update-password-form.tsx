"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, buttonStyles } from "@/components/ui/button";
import { updatePasswordAction } from "@/features/auth/actions/auth";
import { AuthMessage } from "@/features/auth/components/auth-message";
import { FormField } from "@/features/auth/components/form-field";
import { initialAuthActionState, type AuthActionState } from "@/features/auth/types/auth";
import { updatePasswordSchema } from "@/features/auth/validation/auth";

type UpdatePasswordValues = z.infer<typeof updatePasswordSchema>;

export function UpdatePasswordForm() {
  const [state, setState] = useState<AuthActionState>(initialAuthActionState);
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<UpdatePasswordValues>({ resolver: zodResolver(updatePasswordSchema) });
  const onSubmit = handleSubmit((values) => {
    const formData = new FormData();
    formData.set("password", values.password);
    formData.set("passwordConfirmation", values.passwordConfirmation);
    startTransition(async () => setState(await updatePasswordAction(state, formData)));
  });

  if (state.status === "success") {
    return <div className="space-y-5"><AuthMessage message={state.message} status="success" /><Link href="/login" className={buttonStyles("primary", "w-full")}>Continue to sign in</Link></div>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <AuthMessage message={state.message} status="error" />
      <FormField id="password" label="New password" type="password" autoComplete="new-password" error={errors.password?.message ?? state.fieldErrors?.password?.[0]} {...register("password")} />
      <FormField id="passwordConfirmation" label="Confirm new password" type="password" autoComplete="new-password" error={errors.passwordConfirmation?.message ?? state.fieldErrors?.passwordConfirmation?.[0]} {...register("passwordConfirmation")} />
      <Button className="w-full" disabled={isPending} type="submit">{isPending ? "Updating…" : "Update password"}</Button>
    </form>
  );
}
