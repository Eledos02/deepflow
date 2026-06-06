import { describe, expect, it } from "vitest";

import {
  calculateTimerAnalytics,
  type CompletedTimerSession,
} from "./timer-storage";

function session(
  id: string,
  completedAtMs: number,
  durationSeconds = 25 * 60,
  countsAsFocus = true,
): CompletedTimerSession {
  return {
    id,
    completedAtMs,
    durationSeconds,
    timerKind: "focus",
    countsAsFocus,
  };
}

describe("calculateTimerAnalytics", () => {
  it("calculates today and Monday-based week totals", () => {
    const now = new Date(2026, 5, 5, 12).getTime();
    const sessions = [
      session("today", new Date(2026, 5, 5, 9).getTime()),
      session("week", new Date(2026, 5, 2, 9).getTime(), 50 * 60),
      session("old", new Date(2026, 4, 30, 9).getTime()),
    ];

    expect(calculateTimerAnalytics(sessions, now)).toMatchObject({
      sessionsToday: 1,
      sessionsThisWeek: 2,
      focusSecondsToday: 25 * 60,
    });
  });

  it("excludes completed breaks from focused duration", () => {
    const now = new Date(2026, 5, 5, 12).getTime();
    const sessions = [
      session("focus", new Date(2026, 5, 5, 9).getTime()),
      session("break", new Date(2026, 5, 5, 10).getTime(), 5 * 60, false),
    ];

    expect(calculateTimerAnalytics(sessions, now)).toMatchObject({
      sessionsToday: 2,
      focusSecondsToday: 25 * 60,
    });
  });

  it("keeps a streak alive when the latest session was yesterday", () => {
    const now = new Date(2026, 5, 5, 8).getTime();
    const sessions = [
      session("day-one", new Date(2026, 5, 2, 9).getTime()),
      session("day-two", new Date(2026, 5, 3, 9).getTime()),
      session("day-three", new Date(2026, 5, 4, 9).getTime()),
    ];

    expect(calculateTimerAnalytics(sessions, now).currentStreak).toBe(3);
  });

  it("does not count generic countdowns as focus time", () => {
    const now = new Date(2026, 5, 5, 12).getTime();
    const countdown = session(
      "countdown",
      new Date(2026, 5, 5, 9).getTime(),
      30 * 60,
      false,
    );
    countdown.timerKind = "countdown";

    expect(calculateTimerAnalytics([countdown], now)).toMatchObject({
      sessionsToday: 1,
      focusSecondsToday: 0,
      currentStreak: 0,
    });
  });
});
