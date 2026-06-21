import { describe, expect, it, vi } from "vitest";

import { getSupabaseConfig, saveWaitlistSubmission } from "./waitlist-server";

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
});
