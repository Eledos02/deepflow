import { describe, expect, it } from "vitest";

import {
  getActiveFloatingTimer,
  getFloatingTimerMeta,
  getFloatingTimerReturnPath,
  shouldNavigateFromMiniPlayerClick,
  shouldShowFloatingMiniPlayer,
} from "./floating-mini-player";
import type { TimerStateSnapshot } from "./timer-storage";

function createSnapshot(
  overrides: Partial<TimerStateSnapshot> = {},
): TimerStateSnapshot {
  return {
    version: 1,
    storageKey: "tool:focus-timer",
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    status: "idle",
    deadlineMs: null,
    sessionId: null,
    taskName: null,
    updatedAtMs: 1,
    ...overrides,
  };
}

describe("floating mini player helpers", () => {
  it("labels common timer storage keys for the mini player", () => {
    expect(getFloatingTimerMeta("tool:study-timer", 50 * 60)).toMatchObject({
      label: "Study Timer",
      path: "/tools/study-timer",
      timerKind: "focus",
    });

    expect(getFloatingTimerMeta("tool:pomodoro-timer", 25 * 60)).toMatchObject({
      label: "Pomodoro",
      path: "/tools/pomodoro-timer",
      timerKind: "pomodoro",
    });

    expect(getFloatingTimerMeta("duration:90", 90 * 60)).toMatchObject({
      label: "Deep Work Timer",
      path: "/timer/90",
      timerKind: "countdown",
    });
  });

  it("uses the stored source path when returning to an active session", () => {
    expect(
      getFloatingTimerReturnPath(
        createSnapshot({
          sourcePath: "/tools/study-timer",
          storageKey: "tool:focus-timer",
        }),
      ),
    ).toBe("/tools/study-timer");
  });

  it("falls back to the timer route when a legacy session has no source path", () => {
    expect(
      getFloatingTimerReturnPath(
        createSnapshot({
          sourcePath: undefined,
          storageKey: "duration:25",
        }),
      ),
    ).toBe("/timer/25");
  });

  it("does not navigate when no click target exists", () => {
    expect(shouldNavigateFromMiniPlayerClick(null)).toBe(false);
  });

  it("selects the most recently updated running or paused timer", () => {
    const activeTimer = getActiveFloatingTimer(
      [
        createSnapshot({ status: "idle", updatedAtMs: 300 }),
        createSnapshot({
          remainingSeconds: 1200,
          sessionId: "paused-session",
          status: "paused",
          updatedAtMs: 200,
        }),
        createSnapshot({
          deadlineMs: 11_000,
          sessionId: "running-session",
          status: "running",
          updatedAtMs: 400,
        }),
      ],
      10_000,
    );

    expect(activeTimer?.sessionId).toBe("running-session");
    expect(activeTimer?.remainingSeconds).toBe(1);
  });

  it("only shows when an active timer is offscreen and not dismissed", () => {
    expect(
      shouldShowFloatingMiniPlayer({
        activeSessionId: "session-1",
        dismissedSessionId: null,
        isMainTimerVisible: false,
      }),
    ).toBe(true);

    expect(
      shouldShowFloatingMiniPlayer({
        activeSessionId: "session-1",
        dismissedSessionId: "session-1",
        isMainTimerVisible: false,
      }),
    ).toBe(false);

    expect(
      shouldShowFloatingMiniPlayer({
        activeSessionId: "session-1",
        dismissedSessionId: null,
        isMainTimerVisible: true,
      }),
    ).toBe(false);
  });
});
