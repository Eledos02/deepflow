import { afterEach, describe, expect, it, vi } from "vitest";

import {
  completeSession,
  loadStats,
  saveStats,
  updateStreak,
  type TimerStats,
} from "./timer-stats";

afterEach(() => {
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
    ...overrides,
  };
}

describe("timer stats persistence", () => {
  it("loads an empty stats schema when localStorage is empty", () => {
    stubLocalStorage();

    expect(loadStats(new Date(2026, 5, 16, 9).getTime())).toEqual(
      stats(),
    );
  });

  it("saves and reloads valid stats", () => {
    stubLocalStorage();
    const saved = stats({
      sessionsToday: 2,
      focusMinutesToday: 50,
      totalSessions: 8,
      totalFocusMinutes: 200,
      currentStreak: 3,
      bestStreak: 4,
      lastCompletedDate: "2026-06-16",
    });

    saveStats(saved);

    expect(loadStats(new Date(2026, 5, 16, 12).getTime())).toEqual(saved);
  });
});

describe("updateStreak", () => {
  it("starts the streak on the first completed day", () => {
    const completedAtMs = new Date(2026, 5, 16, 10).getTime();

    expect(updateStreak(stats(), completedAtMs)).toMatchObject({
      currentStreak: 1,
      bestStreak: 1,
      lastCompletedDate: "2026-06-16",
    });
  });

  it("does not increment again for multiple sessions on the same day", () => {
    const completedAtMs = new Date(2026, 5, 16, 14).getTime();

    expect(
      updateStreak(
        stats({
          currentStreak: 2,
          bestStreak: 2,
          lastCompletedDate: "2026-06-16",
        }),
        completedAtMs,
      ),
    ).toMatchObject({
      currentStreak: 2,
      bestStreak: 2,
      lastCompletedDate: "2026-06-16",
    });
  });

  it("increments after a consecutive day and resets after missed days", () => {
    const consecutive = updateStreak(
      stats({
        currentStreak: 2,
        bestStreak: 2,
        lastCompletedDate: "2026-06-15",
      }),
      new Date(2026, 5, 16, 9).getTime(),
    );

    expect(consecutive).toMatchObject({
      currentStreak: 3,
      bestStreak: 3,
    });

    expect(
      updateStreak(consecutive, new Date(2026, 5, 19, 9).getTime()),
    ).toMatchObject({
      currentStreak: 1,
      bestStreak: 3,
      lastCompletedDate: "2026-06-19",
    });
  });
});

describe("completeSession", () => {
  it("counts sessions only when completion is recorded", () => {
    stubLocalStorage();

    const nextStats = completeSession({
      durationMinutes: 25,
      completedAtMs: new Date(2026, 5, 16, 9).getTime(),
      countsAsFocus: true,
    });

    expect(nextStats).toMatchObject({
      sessionsToday: 1,
      focusMinutesToday: 25,
      totalSessions: 1,
      totalFocusMinutes: 25,
      currentStreak: 1,
      bestStreak: 1,
      lastCompletedDate: "2026-06-16",
    });
  });

  it("does not add non-focus sessions to focus minutes", () => {
    stubLocalStorage();

    completeSession({
      durationMinutes: 25,
      completedAtMs: new Date(2026, 5, 16, 9).getTime(),
      countsAsFocus: true,
    });
    const nextStats = completeSession({
      durationMinutes: 5,
      completedAtMs: new Date(2026, 5, 16, 10).getTime(),
      countsAsFocus: false,
    });

    expect(nextStats).toMatchObject({
      sessionsToday: 2,
      focusMinutesToday: 25,
      totalSessions: 2,
      totalFocusMinutes: 25,
      currentStreak: 1,
    });
  });

  it("resets today counters and stale streaks after missed days", () => {
    stubLocalStorage();

    completeSession({
      durationMinutes: 25,
      completedAtMs: new Date(2026, 5, 16, 9).getTime(),
    });

    expect(loadStats(new Date(2026, 5, 18, 9).getTime())).toMatchObject({
      sessionsToday: 0,
      focusMinutesToday: 0,
      currentStreak: 0,
      bestStreak: 1,
      lastCompletedDate: "2026-06-16",
    });
  });
});
