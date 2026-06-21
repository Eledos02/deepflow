import { describe, expect, it } from "vitest";

import { parseWaitlistSubmission } from "./waitlist";

describe("waitlist submission", () => {
  it("normalizes a valid founding member submission", () => {
    expect(
      parseWaitlistSubmission({
        email: "  MEMBER@EXAMPLE.COM ",
        source: "pricing-page",
        plan: "founding_member",
      }),
    ).toEqual({
      ok: true,
      value: {
        email: "member@example.com",
        source: "pricing-page",
        plan: "founding_member",
      },
    });
  });

  it("rejects missing and malformed email addresses", () => {
    expect(parseWaitlistSubmission({ email: "" }).ok).toBe(false);
    expect(parseWaitlistSubmission({ email: "not-an-email" }).ok).toBe(false);
  });
});
