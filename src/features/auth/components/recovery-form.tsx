"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { requestPasswordResetAction } from "@/features/auth/actions/auth";
import { AuthMessage } from "@/features/auth/components/auth-message";
import { FormField } from "@/features/auth/components/form-field";
import { initialAuthActionState, type AuthActionState } from "@/features/auth/types/auth";
import { recoverySchema } from "@/features/auth/validation/auth";

type RecoveryValues = z.infer<typeof recoverySchema>;

export function RecoveryForm() {
  const [state, setState] = useState<AuthActionState>(initialAuthActionState);
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<RecoveryValues>({ resolver: zodResolver(recoverySchema) });
  const onSubmit = handleSubmit((values) => {
    const formData = new FormData();
    formData.set("email", values.email);
    startTransition(async () => setState(await requestPasswordResetAction(state, formData)));
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {state.message ? <AuthMessage message={state.message} status={state.status === "success" ? "success" : "error"} /> : null}
      <FormField id="email" label="Email address" type="email" autoComplete="email" error={errors.email?.message ?? state.fieldErrors?.email?.[0]} {...register("email")} />
      <Button className="w-full" disabled={isPending} type="submit">{isPending ? "Sending…" : "Send recovery link"}</Button>
    </form>
  );
}
