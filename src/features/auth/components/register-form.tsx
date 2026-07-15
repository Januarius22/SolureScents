"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { registerAction } from "@/features/auth/actions/auth";
import { AuthMessage } from "@/features/auth/components/auth-message";
import { FormField } from "@/features/auth/components/form-field";
import { initialAuthActionState, type AuthActionState } from "@/features/auth/types/auth";
import { registrationSchema } from "@/features/auth/validation/auth";

type RegistrationValues = z.infer<typeof registrationSchema>;

/** Creates a customer account with server-side validation and email confirmation. */
export function RegisterForm() {
  const [state, setState] = useState<AuthActionState>(initialAuthActionState);
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<RegistrationValues>({ resolver: zodResolver(registrationSchema) });
  const onSubmit = handleSubmit((values) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.set(key, value));
    startTransition(async () => setState(await registerAction(state, formData)));
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {state.message ? <AuthMessage message={state.message} status={state.status === "success" ? "success" : "error"} /> : null}
      <FormField id="fullName" label="Full name" autoComplete="name" error={errors.fullName?.message ?? state.fieldErrors?.fullName?.[0]} {...register("fullName")} />
      <FormField id="email" label="Email address" type="email" autoComplete="email" error={errors.email?.message ?? state.fieldErrors?.email?.[0]} {...register("email")} />
      <FormField id="password" label="Password" type="password" autoComplete="new-password" error={errors.password?.message ?? state.fieldErrors?.password?.[0]} {...register("password")} />
      <FormField id="passwordConfirmation" label="Confirm password" type="password" autoComplete="new-password" error={errors.passwordConfirmation?.message ?? state.fieldErrors?.passwordConfirmation?.[0]} {...register("passwordConfirmation")} />
      <Button className="w-full" disabled={isPending || state.status === "success"} type="submit">{isPending ? "Creating account…" : "Create account"}</Button>
    </form>
  );
}
