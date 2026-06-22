import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({
  findWaitlistSubmission: vi.fn(),
  getSupabaseConfig: vi.fn(),
  isDuplicateWaitlistError: vi.fn(),
  saveWaitlistSubmission: vi.fn(),
  updateWaitlistWelcomeEmail: vi.fn(),
}));
const email = vi.hoisted(() => ({
  getWaitlistEmailConfig: vi.fn(),
  sendWaitlistConfirmationEmail: vi.fn(),
}));
const parser = vi.hoisted(() => ({
  parseWaitlistSubmission: vi.fn(),
}));

vi.mock("@/features/waitlist/waitlist", () => parser);
vi.mock("@/features/waitlist/waitlist-server", () => supabase);
vi.mock("@/features/waitlist/waitlist-email", () => email);

import { POST } from "./route";

const config = {
  url: "https://project.supabase.co",
  serviceRoleKey: "service-key",
};
const unsentRecord = {
  email: "member@example.com",
  welcome_email_sent_at: null,
  welcome_email_error: null,
};

function createRequest(source = "pricing_founding_member") {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 255)}`,
    },
    body: JSON.stringify({
      email: "MEMBER@example.com ",
      source,
      plan: "founding_member",
    }),
  });
}

describe("waitlist confirmation delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.getSupabaseConfig.mockReturnValue(config);
    parser.parseWaitlistSubmission.mockReturnValue({
      ok: true,
      value: {
        email: "member@example.com",
        source: "pricing_founding_member",
        plan: "founding_member",
      },
    });
    email.getWaitlistEmailConfig.mockReturnValue({
      apiKey: "re_test_key",
      from: "DeepFlow <hello@send.deepflownow.com>",
    });
    supabase.updateWaitlistWelcomeEmail.mockResolvedValue({
      ok: true,
      record: unsentRecord,
    });
  });

  it("sends a confirmation for a new signup and records its delivery timestamp", async () => {
    supabase.saveWaitlistSubmission.mockResolvedValue({
      ok: true,
      record: unsentRecord,
    });
    email.sendWaitlistConfirmationEmail.mockResolvedValue({ sent: true });

    const response = await POST(createRequest());

    await expect(response.json()).resolves.toEqual({
      ok: true,
      status: "joined",
      emailSent: true,
    });
    expect(supabase.saveWaitlistSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "member@example.com",
        source: "pricing_founding_member",
      }),
      config,
    );
    expect(supabase.updateWaitlistWelcomeEmail).toHaveBeenCalledWith(
      "member@example.com",
      expect.objectContaining({
        welcome_email_sent_at: expect.any(String),
        welcome_email_error: null,
      }),
      config,
    );
  });

  it("does not resend when a duplicate signup already has a delivery timestamp", async () => {
    supabase.saveWaitlistSubmission.mockResolvedValue({
      ok: false,
      status: 409,
      responseBody: '{"code":"23505"}',
    });
    supabase.isDuplicateWaitlistError.mockReturnValue(true);
    supabase.findWaitlistSubmission.mockResolvedValue({
      ok: true,
      record: {
        ...unsentRecord,
        welcome_email_sent_at: "2026-06-21T12:00:00.000Z",
      },
    });

    const response = await POST(createRequest("homepage_hero"));

    await expect(response.json()).resolves.toEqual({
      ok: true,
      status: "already_joined",
      emailSent: false,
    });
    expect(email.sendWaitlistConfirmationEmail).not.toHaveBeenCalled();
  });

  it("keeps the signup successful when confirmation delivery fails", async () => {
    supabase.saveWaitlistSubmission.mockResolvedValue({
      ok: true,
      record: unsentRecord,
    });
    email.sendWaitlistConfirmationEmail.mockResolvedValue({
      sent: false,
      reason: "provider_error",
      detail: "Provider rejected the request.",
    });

    const response = await POST(createRequest());

    await expect(response.json()).resolves.toEqual({
      ok: true,
      status: "joined",
      emailSent: false,
    });
    expect(supabase.updateWaitlistWelcomeEmail).toHaveBeenCalledWith(
      "member@example.com",
      { welcome_email_error: "Confirmation email could not be sent." },
      config,
    );
  });
});
