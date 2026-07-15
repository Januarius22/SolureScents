"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnvironment } from "@/validation/env";
import type { Database } from "@/types/database";

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient<Database>>;

let browserClient: BrowserSupabaseClient | undefined;

/** Returns one browser-side Supabase client for the current application session. */
export function getBrowserSupabaseClient(): BrowserSupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const environment = getPublicEnvironment();
  browserClient = createBrowserClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  return browserClient;
}
