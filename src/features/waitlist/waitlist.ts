export const WAITLIST_PLAN = "founding_member" as const;

export const WAITLIST_SOURCES = [
  "pricing_founding_member",
  "homepage_hero",
  "homepage_final_cta",
  "workspace_upgrade",
  "guides_cta",
  "unknown",
] as const;

export type WaitlistSource = (typeof WAITLIST_SOURCES)[number];

export type WaitlistSubmission = {
  email: string;
  source: string;
  plan: typeof WAITLIST_PLAN;
};

export type WaitlistSubmissionResult =
  | { ok: true; value: WaitlistSubmission }
  | { ok: false; error: string };

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parseWaitlistSubmission(value: unknown): WaitlistSubmissionResult {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "Enter your email address to join the waitlist." };
  }

  const submission = value as Partial<WaitlistSubmission>;
  const email = typeof submission.email === "string" ? normalizeEmail(submission.email) : "";

  if (!email) {
    return { ok: false, error: "Enter your email address to join the waitlist." };
  }

  if (!isValidEmail(email)) {
    return { ok: false, error: "Use a valid email address, like you@example.com." };
  }

  if (
    submission.plan !== undefined &&
    submission.plan !== WAITLIST_PLAN
  ) {
    return { ok: false, error: "That waitlist plan is not available." };
  }

  return {
    ok: true,
    value: {
      email,
      source:
        typeof submission.source === "string" && submission.source.trim()
          ? submission.source.trim().slice(0, 80)
          : "unknown",
      plan: WAITLIST_PLAN,
    },
  };
}
