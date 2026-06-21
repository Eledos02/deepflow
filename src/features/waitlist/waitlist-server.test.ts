import { describe, expect, it, vi } from "vitest";

import {
  getSupabaseConfig,
  isDuplicateWaitlistError,
  normalizeSupabaseUrl,
  saveWaitlistSubmission,
} from "./waitlist-server";

const submission = {
  email: "member@example.com",
  source: "pricing",
  plan: "founding_member" as const,
};

describe("waitlist server", () => {
  it("keeps Supabase configuration server-only", () => {
    expect(getSupabaseConfig({})).toBeNull();
    expect(
      getSupabaseConfig({
        SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-key",
      }),
    ).toEqual({
      url: "https://project.supabase.co",
      serviceRoleKey: "service-key",
    });
  });

  it("normalizes a project URL or REST URL to the Supabase project origin", () => {
    expect(normalizeSupabaseUrl("https://project.supabase.co")).toBe(
      "https://project.supabase.co",
    );
    expect(normalizeSupabaseUrl("https://project.supabase.co/rest/v1/")).toBe(
      "https://project.supabase.co",
    );
    expect(normalizeSupabaseUrl("not-a-url")).toBeNull();
  });

  it("uses Supabase conflict handling so duplicate emails succeed", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    const result = await saveWaitlistSubmission(
      submission,
      { url: "https://project.supabase.co", serviceRoleKey: "service-key" },
      fetcher,
    );

    expect(result).toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledWith(
      "https://project.supabase.co/rest/v1/waitlist?on_conflict=email",
      expect.objectContaining({
        headers: expect.objectContaining({
          Prefer: "resolution=ignore-duplicates,return=minimal",
        }),
      }),
    );
  });

  it("returns Supabase error details for server-side diagnostics", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response('{"message":"column does not exist"}', { status: 400 }),
    );
    const result = await saveWaitlistSubmission(
      submission,
      { url: "https://project.supabase.co", serviceRoleKey: "service-key" },
      fetcher,
    );

    expect(result).toEqual({
      ok: false,
      status: 400,
      responseBody: '{"message":"column does not exist"}',
    });
  });

  it("recognizes Supabase unique-violation responses as duplicates", () => {
    expect(
      isDuplicateWaitlistError(
        409,
        '{"code":"23505","message":"duplicate key value violates unique constraint"}',
      ),
    ).toBe(true);
    expect(isDuplicateWaitlistError(409, '{"message":"other conflict"}')).toBe(
      false,
    );
  });
});
