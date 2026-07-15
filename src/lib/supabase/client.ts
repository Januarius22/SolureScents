"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnvironment } from "@/validation/env";

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>;

let browserClient: BrowserSupabaseClient | undefined;

/** Returns one browser-side Supabase client for the current application session. */
export function getBrowserSupabaseClient(): BrowserSupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const environment = getPublicEnvironment();
  browserClient = createBrowserClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  return browserClient;
}
