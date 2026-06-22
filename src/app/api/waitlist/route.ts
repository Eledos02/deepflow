import { NextResponse } from "next/server";

import { parseWaitlistSubmission } from "@/features/waitlist/waitlist";
import {
  findWaitlistSubmission,
  getSupabaseConfig,
  isDuplicateWaitlistError,
  saveWaitlistSubmission,
  updateWaitlistWelcomeEmail,
} from "@/features/waitlist/waitlist-server";
import type { WaitlistRecord } from "@/features/waitlist/waitlist-server";
import {
  getWaitlistEmailConfig,
  sendWaitlistConfirmationEmail,
} from "@/features/waitlist/waitlist-email";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;
const RATE_LIMIT_MAX_REQUESTS = 8;
const requestBuckets = new Map<string, number[]>();

function waitlistError(detail: string, status = 502) {
  return NextResponse.json(
    {
      ok: false,
      error: "waitlist_insert_failed",
      detail,
    },
    { status },
  );
}

function isRateLimited(identifier: string, nowMs = Date.now()) {
  const recentRequests = (requestBuckets.get(identifier) ?? []).filter(
    (timestamp) => nowMs - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestBuckets.set(identifier, recentRequests);
    return true;
  }

  requestBuckets.set(identifier, [...recentRequests, nowMs]);
  return false;
}

function getEmailDomain(email: string) {
  return email.split("@")[1] ?? "unknown";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_waitlist_submission",
        detail: "Enter your email address to join the waitlist.",
      },
      { status: 400 },
    );
  }

  const parsed = parseWaitlistSubmission(body);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_waitlist_submission",
        detail: parsed.error,
      },
      { status: 400 },
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const identifier = forwardedFor?.split(",")[0]?.trim() || "unknown";

  if (isRateLimited(identifier)) {
    return NextResponse.json(
      {
        ok: false,
        error: "waitlist_rate_limited",
        detail: "Please wait a moment before trying again.",
      },
      { status: 429 },
    );
  }

  const config = getSupabaseConfig();
  if (!config) {
    console.error("[waitlist] Supabase configuration is missing or invalid", {
      hasSupabaseUrl: Boolean(process.env.SUPABASE_URL?.trim()),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    });
    return waitlistError(
      "Waitlist signups are not configured yet. Please try again soon.",
      503,
    );
  }

  let record: WaitlistRecord;
  let status: "joined" | "already_joined" = "joined";

  try {
    const result = await saveWaitlistSubmission(parsed.value, config);
    if (result.ok) {
      record = result.record;
    } else if (isDuplicateWaitlistError(result.status, result.responseBody)) {
      const existing = await findWaitlistSubmission(parsed.value.email, config);
      if (!existing.ok || !existing.record) {
        console.error("[waitlist] Could not load an existing duplicate signup", {
          normalizedSupabaseUrl: config.url,
          supabaseStatus: existing.ok ? result.status : existing.status,
        });
        return waitlistError(
          "We could not confirm your place on the waitlist. Please try again.",
        );
      }

      record = existing.record;
      status = "already_joined";
    } else {
      console.error("[waitlist] Supabase insert failed", {
        normalizedSupabaseUrl: config.url,
        supabaseStatus: result.status,
        supabaseResponseBody: result.responseBody.slice(0, 2_000),
      });
      return waitlistError(
        "We could not save your place on the waitlist. Please try again.",
      );
    }
  } catch (error) {
    console.error("[waitlist] Supabase request threw before a response", {
      normalizedSupabaseUrl: config.url,
      error: error instanceof Error ? error.message : String(error),
    });
    return waitlistError(
      "We could not save your place on the waitlist. Please try again.",
    );
  }

  if (record.welcome_email_sent_at) {
    console.info("[waitlist] Existing signup already has a confirmation email", {
      status,
      emailDomain: getEmailDomain(parsed.value.email),
      emailSent: false,
    });
    return NextResponse.json({ ok: true, status, emailSent: false });
  }

  const emailConfig = getWaitlistEmailConfig();
  let delivery;

  try {
    delivery = await sendWaitlistConfirmationEmail(
      parsed.value.email,
      emailConfig,
    );
  } catch (error) {
    delivery = {
      sent: false as const,
      reason: "provider_error" as const,
      detail: "The confirmation email request could not be completed.",
    };
    console.error("[waitlist] Confirmation email request threw", {
      status,
      emailDomain: getEmailDomain(parsed.value.email),
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (delivery.sent) {
    const timestamp = new Date().toISOString();
    const updated = await updateWaitlistWelcomeEmail(
      parsed.value.email,
      { welcome_email_sent_at: timestamp, welcome_email_error: null },
      config,
    );

    if (!updated.ok) {
      console.error("[waitlist] Confirmation sent but delivery status was not saved", {
        supabaseStatus: updated.status,
        emailDomain: getEmailDomain(parsed.value.email),
      });
    }

    console.info("[waitlist] Confirmation email sent", {
      status,
      emailDomain: getEmailDomain(parsed.value.email),
      emailSent: true,
    });
    return NextResponse.json({ ok: true, status, emailSent: true });
  }

  const errorSummary =
    delivery.reason === "not_configured"
      ? "Confirmation email is not configured."
      : "Confirmation email could not be sent.";
  const updated = await updateWaitlistWelcomeEmail(
    parsed.value.email,
    { welcome_email_error: errorSummary },
    config,
  );

  if (!updated.ok) {
    console.error("[waitlist] Confirmation failure status was not saved", {
      supabaseStatus: updated.status,
      emailDomain: getEmailDomain(parsed.value.email),
    });
  }

  console.warn("[waitlist] Confirmation email was not sent", {
    status,
    emailDomain: getEmailDomain(parsed.value.email),
    emailSent: false,
    reason: delivery.reason,
  });
  return NextResponse.json({ ok: true, status, emailSent: false });
}
