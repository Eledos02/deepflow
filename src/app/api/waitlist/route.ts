import { NextResponse } from "next/server";

import { parseWaitlistSubmission } from "@/features/waitlist/waitlist";
import {
  getSupabaseConfig,
  saveWaitlistSubmission,
} from "@/features/waitlist/waitlist-server";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;
const RATE_LIMIT_MAX_REQUESTS = 8;
const requestBuckets = new Map<string, number[]>();

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

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Enter your email address to join the waitlist." },
      { status: 400 },
    );
  }

  const parsed = parseWaitlistSubmission(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const identifier = forwardedFor?.split(",")[0]?.trim() || "unknown";

  if (isRateLimited(identifier)) {
    return NextResponse.json(
      { error: "Please wait a moment before trying again." },
      { status: 429 },
    );
  }

  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Waitlist signups are not configured yet. Please try again soon." },
      { status: 503 },
    );
  }

  try {
    const result = await saveWaitlistSubmission(parsed.value, config);
    if (result.ok) {
      return NextResponse.json({ success: true });
    }
  } catch {
    // Keep database transport details private from the client.
  }

  return NextResponse.json(
    { error: "We could not save your place on the waitlist. Please try again." },
    { status: 502 },
  );
}
