import { describe, expect, it } from "vitest";

import type { FocusJournalEntry } from "@/features/timer/focus-journal";
import type { TimerStats } from "@/features/timer/timer-stats";

import {
  calculateFocusMomentum,
  calculateFocusStreaks,
  calculateWorkspaceAnalytics,
  getBestFocusDay,
  getBestFocusHour,
  getWeeklyFocusActivity,
} from "./workspace-analytics";

function entry(
  id: string,
  completedAt: string,
  durationMinutes: number,
): FocusJournalEntry {
  return {
    id,
    title: id,
    intention: id,
    durationMinutes,
    timerType: "Focus Timer",
    completedAt,
    sourcePath: "/tools/focus-timer",
  };
}

function stats(overrides: Partial<TimerStats> = {}): TimerStats {
  return {
    version: 1,
    sessionsToday: 0,
    focusMinutesToday: 0,
    totalSessions: 0,
    totalFocusMinutes: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
    sessionHistory: [],
    ...overrides,
  };
}

describe("workspace analytics", () => {
  const nowMs = new Date(2026, 5, 18, 12).getTime();

  it("calculates current and best streaks from distinct completion days", () => {
    const streaks = calculateFocusStreaks(
      [
        entry("old-one", new Date(2026, 5, 8, 9).toISOString(), 25),
        entry("old-two", new Date(2026, 5, 9, 9).toISOString(), 25),
        entry("monday", new Date(2026, 5, 15, 9).toISOString(), 25),
        entry("tuesday", new Date(2026, 5, 16, 9).toISOString(), 25),
        entry("today", new Date(2026, 5, 18, 9).toISOString(), 25),
      ],
      nowMs,
    );

    expect(streaks).toEqual({ currentStreak: 1, bestStreak: 2 });
  });

  it("aggregates a Monday-through-Sunday activity series with zero-value days", () => {
    const activity = getWeeklyFocusActivity(
      [
        entry("monday", new Date(2026, 5, 15, 9).toISOString(), 25),
        entry("wednesday", new Date(2026, 5, 17, 9).toISOString(), 50),
      ],
      nowMs,
    );

    expect(activity.map((day) => [day.label, day.minutes])).toEqual([
      ["Monday", 25],
      ["Tuesday", 0],
      ["Wednesday", 50],
      ["Thursday", 0],
      ["Friday", 0],
      ["Saturday", 0],
      ["Sunday", 0],
    ]);
  });

  it("classifies momentum by comparing the latest seven days with the previous seven", () => {
    const rising = calculateFocusMomentum(
      [
        entry("previous", new Date(2026, 5, 6, 9).toISOString(), 40),
        entry("current", new Date(2026, 5, 17, 9).toISOString(), 50),
      ],
      nowMs,
    );
    const slowing = calculateFocusMomentum(
      [
        entry("previous", new Date(2026, 5, 6, 9).toISOString(), 100),
        entry("current", new Date(2026, 5, 17, 9).toISOString(), 50),
      ],
      nowMs,
    );

    expect(rising).toMatchObject({ state: "rising", percentChange: 25 });
    expect(slowing).toMatchObject({ state: "slowing", percentChange: -50 });
  });

  it("uses a calm bounded momentum value when there is no prior-week baseline", () => {
    const momentum = calculateFocusMomentum(
      [entry("first-week", new Date(2026, 5, 17, 9).toISOString(), 90)],
      nowMs,
    );

    expect(momentum).toMatchObject({ state: "rising", percentChange: 100 });
  });

  it("finds the best focus day and best focus hour", () => {
    const entries = [
      entry("monday", new Date(2026, 5, 15, 9, 0).toISOString(), 25),
      entry("tuesday-one", new Date(2026, 5, 16, 9, 0).toISOString(), 50),
      entry("tuesday-two", new Date(2026, 5, 16, 9, 0).toISOString(), 25),
    ];

    expect(getBestFocusDay(entries)).toBe("Tuesday");
    expect(getBestFocusHour(entries)).toMatch(/9:00/);
  });

  it("creates dashboard metrics from session stats and focus history", () => {
    const analytics = calculateWorkspaceAnalytics(
      [entry("today", new Date(2026, 5, 18, 9).toISOString(), 25)],
      stats({
        totalSessions: 4,
        totalFocusMinutes: 100,
        sessionsToday: 1,
        currentStreak: 3,
        bestStreak: 6,
      }),
      nowMs,
    );

    expect(analytics).toMatchObject({
      totalFocusMinutes: 100,
      totalSessions: 4,
      sessionsToday: 1,
      currentStreak: 3,
      bestStreak: 6,
      averageSessionLength: 25,
      focusMinutesThisWeek: 25,
    });
  });

  it("uses stored session history for analytics when journal entries are not available", () => {
    const analytics = calculateWorkspaceAnalytics(
      [],
      stats({
        totalSessions: 1,
        totalFocusMinutes: 50,
        sessionHistory: [
          {
            completedAt: new Date(2026, 5, 16, 9).toISOString(),
            durationMinutes: 50,
            timerType: "Focus Timer",
            path: "/tools/focus-timer",
          },
        ],
      }),
      nowMs,
    );

    expect(analytics).toMatchObject({
      focusMinutesThisWeek: 50,
      bestFocusDay: "Tuesday",
    });
    expect(analytics.bestFocusHour).toMatch(/9:00/);
  });
});
