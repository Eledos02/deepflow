import { afterEach, describe, expect, it, vi } from "vitest";

import {
  calculateTimerAnalytics,
  getCompletedSessionsStorageKey,
  readCompletedSessions,
  readAudioPreferences,
  saveCompletedSession,
  writeAudioPreferences,
  type CompletedTimerSession,
} from "./timer-storage";
import { setLocalDataScopeForUser } from "../sync/local-data-scope";

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

  vi.stubGlobal("window", { localStorage });
  return values;
}

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

describe("completed session account isolation", () => {
  it("does not show Account A sessions while Account B is active", () => {
    const values = stubLocalStorage();

    setLocalDataScopeForUser("account-a");
    saveCompletedSession(session("account-a-session", Date.now()));
    expect(getCompletedSessionsStorageKey()).toBe(
      "deepflow:user:account-a:focus_sessions",
    );

    setLocalDataScopeForUser("account-b");
    expect(readCompletedSessions()).toEqual([]);
    saveCompletedSession(session("account-b-session", Date.now()));

    expect(readCompletedSessions()).toEqual([
      expect.objectContaining({ id: "account-b-session" }),
    ]);
    expect(JSON.parse(values.get("deepflow:user:account-a:focus_sessions") ?? "[]")).toEqual([
      expect.objectContaining({ id: "account-a-session" }),
    ]);
    expect(JSON.parse(values.get("deepflow:user:account-b:focus_sessions") ?? "[]")).toEqual([
      expect.objectContaining({ id: "account-b-session" }),
    ]);
  });

  it("starts clean for a new account even when legacy global sessions exist", () => {
    stubLocalStorage({
      "deepflow:completed-sessions:v1": JSON.stringify([
        session("legacy-session", Date.now()),
      ]),
    });

    setLocalDataScopeForUser("new-account");

    expect(readCompletedSessions()).toEqual([]);
  });
});

describe("audio preferences", () => {
  it("persists one global preference record and clamps volume", () => {
    const values = stubLocalStorage();

    writeAudioPreferences({
      version: 1,
      alarmSoundId: "zen-gong",
      backgroundSoundId: "rain-window",
      volume: 1.4,
    });

    expect(values.size).toBe(1);
    expect(readAudioPreferences()).toEqual({
      version: 1,
      alarmSoundId: "zen-gong",
      backgroundSoundId: "rain-window",
      volume: 1,
    });
  });

  it("ignores malformed stored audio preferences", () => {
    stubLocalStorage({
      "deepflow:audio-preferences:v1": JSON.stringify({
        version: 1,
        alarmSoundId: "missing-alarm",
        backgroundSoundId: "rain-window",
        volume: 0.5,
      }),
    });

    expect(readAudioPreferences()).toBeNull();
  });
});
