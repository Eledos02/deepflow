import { describe, expect, it, vi } from "vitest";

import {
  findWaitlistSubmission,
  getSupabaseConfig,
  isDuplicateWaitlistError,
  normalizeSupabaseUrl,
  saveWaitlistSubmission,
  updateWaitlistWelcomeEmail,
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

  it("inserts a waitlist row and returns delivery state", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json([
        {
          email: "member@example.com",
          welcome_email_sent_at: null,
          welcome_email_error: null,
        },
      ]),
    );
    const result = await saveWaitlistSubmission(
      submission,
      { url: "https://project.supabase.co", serviceRoleKey: "service-key" },
      fetcher,
    );

    expect(result).toEqual({
      ok: true,
      record: {
        email: "member@example.com",
        welcome_email_sent_at: null,
        welcome_email_error: null,
      },
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://project.supabase.co/rest/v1/waitlist",
      expect.objectContaining({
        headers: expect.objectContaining({
          Prefer: "return=representation",
        }),
      }),
    );
  });

  it("finds an existing waitlist row to determine whether email was already sent", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json([
        {
          email: "member@example.com",
          welcome_email_sent_at: "2026-06-21T12:00:00.000Z",
          welcome_email_error: null,
        },
      ]),
    );

    await expect(
      findWaitlistSubmission(
        "member@example.com",
        { url: "https://project.supabase.co", serviceRoleKey: "service-key" },
        fetcher,
      ),
    ).resolves.toMatchObject({
      ok: true,
      record: { welcome_email_sent_at: "2026-06-21T12:00:00.000Z" },
    });
  });

  it("updates the confirmation delivery state without changing the signup data", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json([
        {
          email: "member@example.com",
          welcome_email_sent_at: "2026-06-21T12:00:00.000Z",
          welcome_email_error: null,
        },
      ]),
    );

    const result = await updateWaitlistWelcomeEmail(
      "member@example.com",
      { welcome_email_sent_at: "2026-06-21T12:00:00.000Z", welcome_email_error: null },
      { url: "https://project.supabase.co", serviceRoleKey: "service-key" },
      fetcher,
    );

    expect(result).toMatchObject({ ok: true });
    expect(fetcher).toHaveBeenCalledWith(
      "https://project.supabase.co/rest/v1/waitlist?email=eq.member%40example.com",
      expect.objectContaining({ method: "PATCH" }),
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
