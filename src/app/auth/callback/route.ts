import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUserAccess, resolveRoleHome } from "@/features/auth/services/authorization";

const otpTypes = new Set<EmailOtpType>([
  "email",
  "email_change",
  "invite",
  "magiclink",
  "recovery",
  "signup",
]);

function safeNextPath(value: string | null): string | null {
  return value?.startsWith("/") && !value.startsWith("//") ? value : null;
}

/** Exchanges Supabase PKCE or token-hash callbacks for a cookie-backed session. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const rawType = url.searchParams.get("type");
  const requestedNext = safeNextPath(url.searchParams.get("next"));
  const supabase = await createServerSupabaseClient();

  let authError: Error | null = null;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error;
  } else if (tokenHash && rawType && otpTypes.has(rawType as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: rawType as EmailOtpType,
    });
    authError = error;
  } else {
    authError = new Error("Missing authentication callback parameters.");
  }

  if (authError) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "callback_failed");
    return NextResponse.redirect(loginUrl);
  }

  if (requestedNext) {
    return NextResponse.redirect(new URL(requestedNext, request.url));
  }

  const access = await getCurrentUserAccess();
  return NextResponse.redirect(new URL(access ? resolveRoleHome(access.roles) : "/login", request.url));
}
