"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type BrowserSupabaseEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};

export type BrowserSupabaseConfig = {
  url: string;
  anonKey: string;
};

let client: SupabaseClient | null | undefined;

export function getSupabaseBrowserConfig(
  environment: BrowserSupabaseEnvironment = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
): BrowserSupabaseConfig | null {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = environment.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) return null;

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      return null;
    }
  } catch {
    return null;
  }

  return { url, anonKey };
}

export function getSupabaseBrowserClient() {
  if (client !== undefined) return client;

  const config = getSupabaseBrowserConfig();
  client = config
    ? createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

  return client;
}
