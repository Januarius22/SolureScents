"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { loginAction } from "@/features/auth/actions/auth";
import { AuthMessage } from "@/features/auth/components/auth-message";
import { FormField } from "@/features/auth/components/form-field";
import { initialAuthActionState, type AuthActionState } from "@/features/auth/types/auth";
import { loginSchema } from "@/features/auth/validation/auth";

type LoginValues = z.infer<typeof loginSchema>;

/** Shared credential form for customers and every staff role. */
export function LoginForm() {
  const [state, setState] = useState<AuthActionState>(initialAuthActionState);
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = handleSubmit((values) => {
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);
    startTransition(async () => setState(await loginAction(state, formData)));
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <AuthMessage message={state.message} status="error" />
      <FormField id="email" label="Email address" type="email" autoComplete="email" error={errors.email?.message ?? state.fieldErrors?.email?.[0]} {...register("email")} />
      <FormField id="password" label="Password" type="password" autoComplete="current-password" error={errors.password?.message ?? state.fieldErrors?.password?.[0]} {...register("password")} />
      <div className="flex justify-end"><Link className="text-sm text-muted underline-offset-4 hover:text-gold hover:underline" href="/forgot-password">Forgot password?</Link></div>
      <Button className="w-full" disabled={isPending} type="submit">{isPending ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}
