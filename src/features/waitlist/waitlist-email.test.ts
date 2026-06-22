import { describe, expect, it, vi } from "vitest";

import {
  WAITLIST_CONFIRMATION_SUBJECT,
  buildWaitlistConfirmationEmail,
  getWaitlistEmailConfig,
  sendWaitlistConfirmationEmail,
} from "./waitlist-email";

const config = {
  apiKey: "re_test_key",
  from: "DeepFlow <hello@send.deepflownow.com>",
  replyTo: "founders@deepflownow.com",
};

describe("waitlist confirmation email", () => {
  it("keeps email configuration server-only and optional", () => {
    expect(getWaitlistEmailConfig({})).toBeNull();
    expect(
      getWaitlistEmailConfig({
        RESEND_API_KEY: "re_test_key",
        WAITLIST_FROM_EMAIL: config.from,
      }),
    ).toEqual({ ...config, replyTo: undefined });
  });

  it("sends a transactional waitlist confirmation through a mocked Resend client", async () => {
    const send = vi.fn().mockResolvedValue({ error: null });
    const result = await sendWaitlistConfirmationEmail("member@example.com", config, {
      emails: { send },
    });

    expect(result).toEqual({ sent: true });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: config.from,
        to: ["member@example.com"],
        replyTo: config.replyTo,
        subject: WAITLIST_CONFIRMATION_SUBJECT,
      }),
    );
  });

  it("does not attempt email delivery when Resend is not configured", async () => {
    await expect(
      sendWaitlistConfirmationEmail("member@example.com", null),
    ).resolves.toEqual({
      sent: false,
      reason: "not_configured",
      detail: "Resend or the waitlist sender is not configured.",
    });
  });

  it("keeps provider failures safe so signup handling can continue", async () => {
    const result = await sendWaitlistConfirmationEmail("member@example.com", config, {
      emails: {
        send: vi.fn().mockResolvedValue({
          error: { message: "Sender domain is not verified" },
        }),
      },
    });

    expect(result).toEqual({
      sent: false,
      reason: "provider_error",
      detail: "Sender domain is not verified",
    });
  });

  it("renders plain text and HTML without tracking pixels or sender secrets", () => {
    const content = buildWaitlistConfirmationEmail();

    expect(WAITLIST_CONFIRMATION_SUBJECT).toBe(
      "Your DeepFlow waitlist confirmation",
    );
    expect(content.text).toContain("You're confirmed on the DeepFlow waitlist.");
    expect(content.text).toContain("No payment was made today.");
    expect(content.text).not.toContain("$19 lifetime access");
    expect(content.text).not.toContain("launch price expires");
    expect(content.html).toContain("DeepFlow");
    expect(content.html).toContain("You're confirmed on the waitlist.");
    expect(content.html).not.toContain("Founding Member");
    expect(content.html).not.toContain("$19 lifetime access");
    expect(content.html).not.toContain("<img");
    expect(content.html).not.toContain("re_");
  });
});
