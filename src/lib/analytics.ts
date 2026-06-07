"use client";

import { sendGAEvent } from "@next/third-parties/google";

export type DeepFlowAnalyticsEvent =
  | "timer_start"
  | "timer_pause"
  | "timer_reset"
  | "timer_complete"
  | "focus_session_complete";

const googleAnalyticsId = process.env.NEXT_PUBLIC_GA_ID?.trim();

export function trackTimerEvent(
  eventName: DeepFlowAnalyticsEvent,
  durationMinutes: number,
) {
  if (!googleAnalyticsId || typeof window === "undefined") return;

  try {
    sendGAEvent("event", eventName, {
      duration_minutes: durationMinutes,
      current_path: window.location.pathname,
    });
  } catch {
    // Analytics must never interrupt timer controls or session completion.
  }
}
