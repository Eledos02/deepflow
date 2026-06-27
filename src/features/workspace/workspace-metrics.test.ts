import { afterEach, describe, expect, it, vi } from "vitest";

import type { FocusJournalEntry } from "@/features/timer/focus-journal";
import type { TimerStats } from "@/features/timer/timer-stats";
import { setLocalDataScopeForUser } from "../sync/local-data-scope";

import {
  DEFAULT_WORKSPACE_WEEKLY_GOAL,
  calculateWorkspaceGoalProgress,
  calculateWorkspaceMetrics,
  getCurrentWeekJournalEntries,
  parseWorkspaceWeeklyGoal,
  readWorkspaceWeeklyGoal,
  saveWorkspaceWeeklyGoal,
} from "./workspace-metrics";

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

afterEach(() => {
  setLocalDataScopeForUser(null);
  vi.unstubAllGlobals();
});

function stubLocalStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };

  vi.stubGlobal("window", {
    dispatchEvent: vi.fn(),
    localStorage,
  });

  return values;
}

describe("workspace metrics", () => {
  const nowMs = new Date(2026, 5, 18, 12).getTime();

  it("filters entries to the current local week", () => {
    const entries = [
      entry("before-week", new Date(2026, 5, 14, 12).toISOString(), 60),
      entry("monday", new Date(2026, 5, 15, 9).toISOString(), 25),
      entry("today", new Date(2026, 5, 18, 10).toISOString(), 50),
    ];

    expect(getCurrentWeekJournalEntries(entries, nowMs).map((item) => item.id))
      .toEqual(["monday", "today"]);
  });

  it("calculates weekly focus time and average session length", () => {
    const metrics = calculateWorkspaceMetrics(
      [
        entry("one", new Date(2026, 5, 15, 9).toISOString(), 25),
        entry("two", new Date(2026, 5, 18, 10).toISOString(), 50),
        entry("old", new Date(2026, 5, 8, 10).toISOString(), 15),
      ],
      stats({
        sessionsToday: 1,
        currentStreak: 4,
        bestStreak: 6,
      }),
      nowMs,
    );

    expect(metrics).toMatchObject({
      totalFocusSessions: 3,
      totalFocusMinutes: 90,
      sessionsToday: 1,
      currentStreak: 4,
      bestStreak: 6,
      sessionsThisWeek: 2,
      focusMinutesThisWeek: 75,
      averageSessionLength: 30,
      longestSessionMinutes: 50,
    });
    expect(metrics.mostProductiveDay).toBeTruthy();
  });

  it("falls back to session stats when journal history is empty", () => {
    const metrics = calculateWorkspaceMetrics(
      [],
      stats({
        totalSessions: 5,
        totalFocusMinutes: 125,
      }),
      nowMs,
    );

    expect(metrics.totalFocusSessions).toBe(5);
    expect(metrics.totalFocusMinutes).toBe(125);
    expect(metrics.averageSessionLength).toBe(25);
    expect(metrics.mostProductiveDay).toBeNull();
  });

  it("calculates weekly goal progress from sessions or minutes", () => {
    const progress = calculateWorkspaceGoalProgress(
      [
        entry("one", new Date(2026, 5, 15, 9).toISOString(), 25),
        entry("two", new Date(2026, 5, 18, 10).toISOString(), 50),
      ],
      { sessions: 10, minutes: 100 },
      nowMs,
    );

    expect(progress).toMatchObject({
      progressPercent: 75,
      sessionProgressPercent: 20,
      minuteProgressPercent: 75,
      sessionsThisWeek: 2,
      focusMinutesThisWeek: 75,
      remainingSessions: 8,
      remainingMinutes: 25,
    });
  });

  it("returns calm empty-state metrics with no data", () => {
    const metrics = calculateWorkspaceMetrics([], stats(), nowMs);
    const progress = calculateWorkspaceGoalProgress(
      [],
      DEFAULT_WORKSPACE_WEEKLY_GOAL,
      nowMs,
    );

    expect(metrics).toMatchObject({
      totalFocusSessions: 0,
      totalFocusMinutes: 0,
      averageSessionLength: 0,
      mostProductiveDay: null,
    });
    expect(progress).toMatchObject({
      progressPercent: 0,
      remainingSessions: 10,
      remainingMinutes: 250,
    });
  });

  it("normalizes invalid weekly goals to the default goal", () => {
    expect(parseWorkspaceWeeklyGoal({ sessions: -1, minutes: "nope" }))
      .toEqual(DEFAULT_WORKSPACE_WEEKLY_GOAL);
  });

  it("does not show Account A goal while Account B is active", () => {
    const values = stubLocalStorage();

    setLocalDataScopeForUser("account-a");
    saveWorkspaceWeeklyGoal({ sessions: 12, minutes: 300 });

    setLocalDataScopeForUser("account-b");
    expect(readWorkspaceWeeklyGoal()).toEqual(DEFAULT_WORKSPACE_WEEKLY_GOAL);
    saveWorkspaceWeeklyGoal({ sessions: 5, minutes: 100 });

    expect(readWorkspaceWeeklyGoal()).toEqual({ sessions: 5, minutes: 100 });
    expect(JSON.parse(values.get("deepflow:user:account-a:focus_goal") ?? "{}")).toEqual({
      sessions: 12,
      minutes: 300,
    });
    expect(JSON.parse(values.get("deepflow:user:account-b:focus_goal") ?? "{}")).toEqual({
      sessions: 5,
      minutes: 100,
    });
  });
});
