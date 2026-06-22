import { describe, expect, it } from "vitest";

import type { FocusJournalEntry } from "@/features/timer/focus-journal";
import type { TimerStats } from "@/features/timer/timer-stats";

import {
  calculateFocusMomentum,
  calculateFocusStreaks,
  calculateAverageFocusSessionLength,
  calculateWorkspaceAnalytics,
  formatFocusDuration,
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

  it("does not fabricate a focus pattern when there are no completed sessions", () => {
    const analytics = calculateWorkspaceAnalytics([], stats(), nowMs);

    expect(analytics).toMatchObject({
      totalSessions: 0,
      focusEntryCount: 0,
      recentFocusEntryCount: 0,
      averageSessionLengthLastSevenDays: 0,
      hasEnoughFocusPatternData: false,
      hasEnoughRecentFocusPatternData: false,
      bestFocusDay: null,
      bestFocusHour: null,
      bestFocusDayLastSevenDays: null,
      bestFocusHourLastSevenDays: null,
      momentum: { hasBaseline: false },
    });
  });

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

    expect(momentum).toMatchObject({
      state: "stable",
      hasBaseline: false,
      percentChange: 0,
    });
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

  it("waits for three completed sessions before naming a focus pattern", () => {
    const oneSession = [
      entry("one", new Date(2026, 5, 17, 22).toISOString(), 25),
    ];
    const twoSessions = [
      ...oneSession,
      entry("two", new Date(2026, 5, 18, 22).toISOString(), 25),
    ];

    expect(getBestFocusDay(oneSession)).toBeNull();
    expect(getBestFocusHour(oneSession)).toBeNull();
    expect(getBestFocusDay(twoSessions)).toBeNull();
    expect(getBestFocusHour(twoSessions)).toBeNull();
  });

  it("breaks tied focus hours with the most recent completed session", () => {
    const entries = [
      entry("morning", new Date(2026, 5, 15, 9).toISOString(), 25),
      entry("midday", new Date(2026, 5, 16, 12).toISOString(), 10),
      entry("evening", new Date(2026, 5, 17, 20).toISOString(), 25),
    ];

    expect(getBestFocusHour(entries)).toMatch(/8:00 PM/);
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
      averageSessionLengthLastSevenDays: 25,
      focusMinutesThisWeek: 25,
      sessionsLastSevenDays: 1,
      focusMinutesLastSevenDays: 25,
      activeFocusDaysLastSevenDays: 1,
      hasEnoughRecentFocusPatternData: false,
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
      averageSessionLengthLastSevenDays: 50,
      bestFocusDay: null,
      bestFocusHour: null,
      hasEnoughFocusPatternData: false,
    });
  });

  it("uses only deduped completed sessions from the latest seven days for Insights averages", () => {
    const recentTimestamp = new Date(2026, 5, 17, 9).toISOString();
    const analytics = calculateWorkspaceAnalytics(
      [
        entry("old", new Date(2026, 5, 1, 9).toISOString(), 120),
        entry("five", recentTimestamp, 5),
        entry("ten", new Date(2026, 5, 18, 9).toISOString(), 10),
        entry("fifteen", new Date(2026, 5, 18, 10).toISOString(), 15),
      ],
      stats({
        totalSessions: 4,
        totalFocusMinutes: 150,
        sessionHistory: [
          {
            completedAt: recentTimestamp,
            durationMinutes: 5,
            timerType: "Focus Timer",
            path: "/tools/focus-timer",
          },
        ],
      }),
      nowMs,
    );

    expect(analytics.averageSessionLength).toBe(38);
    expect(analytics.averageSessionLengthLastSevenDays).toBe(10);
    expect(analytics.recentFocusEntryCount).toBe(3);
  });

  it("calculates a fresh average for one, two, and three completed sessions", () => {
    const first = entry("one", new Date(2026, 5, 18, 9).toISOString(), 5);
    const second = entry("two", new Date(2026, 5, 18, 10).toISOString(), 10);
    const third = entry("three", new Date(2026, 5, 18, 11).toISOString(), 15);

    expect(calculateAverageFocusSessionLength([first])).toBe(5);
    expect(calculateAverageFocusSessionLength([first, second])).toBe(8);
    expect(calculateAverageFocusSessionLength([first, second, third])).toBe(10);
  });

  it("excludes invalid, zero-duration entries and formats recent averages consistently", () => {
    const validEntry = entry("valid", new Date(2026, 5, 18, 9).toISOString(), 75);
    const zeroDurationEntry = entry("zero", new Date(2026, 5, 18, 10).toISOString(), 0);
    const invalidTimestampEntry = entry("invalid", "not-a-date", 25);

    expect(
      calculateAverageFocusSessionLength([
        validEntry,
        zeroDurationEntry,
        invalidTimestampEntry,
      ]),
    ).toBe(75);
    expect(formatFocusDuration(13)).toBe("13m");
    expect(formatFocusDuration(75)).toBe("1h 15m");
  });

  it("updates the seven-day average as a new completed session becomes available", () => {
    const entries = [entry("first", new Date(2026, 5, 18, 9).toISOString(), 5)];
    const firstAnalytics = calculateWorkspaceAnalytics(entries, stats(), nowMs);
    const updatedAnalytics = calculateWorkspaceAnalytics(
      [...entries, entry("second", new Date(2026, 5, 18, 10).toISOString(), 15)],
      stats(),
      nowMs,
    );

    expect(firstAnalytics.averageSessionLengthLastSevenDays).toBe(5);
    expect(updatedAnalytics.averageSessionLengthLastSevenDays).toBe(10);
  });
});
