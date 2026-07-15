"use server";

import { redirect } from "next/navigation";

import { siteConfig } from "@/config/site";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUserAccess, resolveRoleHome } from "@/features/auth/services/authorization";
import type { AuthActionState } from "@/features/auth/types/auth";
import {
  loginSchema,
  recoverySchema,
  registrationSchema,
  updatePasswordSchema,
} from "@/features/auth/validation/auth";

function fieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return error.flatten().fieldErrors;
}

/** Authenticates all roles through the single shared login entry point. */
export async function loginAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { status: "error", message: "The email or password is incorrect." };
  }

  const access = await getCurrentUserAccess();
  if (!access || access.status !== "active") {
    await supabase.auth.signOut();
    return { status: "error", message: "This account is currently unavailable." };
  }

  redirect(resolveRoleHome(access.roles));
}

/** Registers a customer and sends the configured Supabase confirmation email. */
export async function registerAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registrationSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteConfig.url}/auth/callback`,
    },
  });

  if (error) {
    return { status: "error", message: "We could not create your account. Please try again." };
  }

  return {
    status: "success",
    message: "Check your inbox to confirm your email address.",
  };
}

/** Sends a password recovery link without revealing whether an account exists. */
export async function requestPasswordResetAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = recoverySchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteConfig.url}/auth/callback?next=/update-password`,
  });

  if (error) {
    console.error("Password recovery request failed", error);
  }

  return {
    status: "success",
    message: "If an account exists for that email, a recovery link is on its way.",
  };
}

/** Updates the password for an authenticated recovery session. */
export async function updatePasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { status: "error", message: "Your password could not be updated. Request a new link." };
  }

  return { status: "success", message: "Your password has been updated. You can now sign in." };
}

/** Ends the current Supabase session and returns to the public store. */
export async function logoutAction(): Promise<never> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error("Unable to sign out.", { cause: error });
  }
  redirect("/");
}
