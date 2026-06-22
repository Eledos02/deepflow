import { describe, expect, it } from "vitest";

import { getSupabaseBrowserConfig } from "./browser";

describe("browser Supabase configuration", () => {
  it("requires only public URL and anon-key configuration for client auth", () => {
    expect(getSupabaseBrowserConfig({})).toBeNull();
    expect(
      getSupabaseBrowserConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
      }),
    ).toEqual({
      url: "https://project.supabase.co",
      anonKey: "public-anon-key",
    });
  });

  it("rejects malformed public Supabase URLs", () => {
    expect(
      getSupabaseBrowserConfig({
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
      }),
    ).toBeNull();
  });
});
