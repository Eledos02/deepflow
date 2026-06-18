import { getTimerPath, isConfiguredTimer } from "../../config/timers";
import { getTimerToolPath, type TimerKind } from "../../content/timer-tools";
import { getRemainingSeconds } from "./timer-engine";
import type { TimerStateSnapshot } from "./timer-storage";

export type FloatingTimerMeta = {
  label: string;
  path: string;
  timerKind: TimerKind;
};

export type FloatingTimerSnapshot = TimerStateSnapshot & {
  remainingSeconds: number;
};

type MiniPlayerVisibilityInput = {
  activeSessionId: string | null;
  dismissedSessionId: string | null;
  isMainTimerVisible: boolean;
};

export function getFloatingTimerReturnPath(
  timer: Pick<TimerStateSnapshot, "sourcePath" | "storageKey" | "totalSeconds">,
) {
  return timer.sourcePath ??
    getFloatingTimerMeta(timer.storageKey, timer.totalSeconds).path;
}

export function shouldNavigateFromMiniPlayerClick(target: EventTarget | null) {
  if (!target) return false;
  if (typeof Element === "undefined") return true;

  return !(
    target instanceof Element &&
    Boolean(target.closest("button, a, input, select, textarea, summary, details"))
  );
}

export function getFloatingTimerMeta(
  storageKey: string,
  totalSeconds: number,
): FloatingTimerMeta {
  const durationMatch = /^duration:(\d+)$/.exec(storageKey);
  const minutes = Math.max(1, Math.round(totalSeconds / 60));

  if (durationMatch) {
    const durationMinutes = Number(durationMatch[1]);
    return {
      label: durationMinutes >= 60 ? "Deep Work Timer" : "Focus Timer",
      path: isConfiguredTimer(durationMinutes)
        ? getTimerPath(durationMinutes)
        : getTimerPath(minutes),
      timerKind: "countdown",
    };
  }

  const toolSlug = storageKey.replace(/^tool:/, "");

  if (toolSlug === "study-timer") {
    return {
      label: "Study Timer",
      path: getTimerToolPath(toolSlug),
      timerKind: "focus",
    };
  }

  if (toolSlug === "pomodoro-timer") {
    return {
      label: "Pomodoro",
      path: getTimerToolPath(toolSlug),
      timerKind: "pomodoro",
    };
  }

  return {
    label: minutes >= 60 ? "Deep Work Timer" : "Focus Timer",
    path: toolSlug === "focus-timer"
      ? getTimerToolPath(toolSlug)
      : "/tools/focus-timer",
    timerKind: toolSlug === "countdown-timer" ? "countdown" : "focus",
  };
}

export function getActiveFloatingTimer(
  snapshots: TimerStateSnapshot[],
  nowMs = Date.now(),
): FloatingTimerSnapshot | null {
  const activeTimers = snapshots
    .filter(
      (snapshot) =>
        snapshot.status === "running" || snapshot.status === "paused",
    )
    .map((snapshot) => ({
      ...snapshot,
      remainingSeconds:
        snapshot.status === "running" && snapshot.deadlineMs !== null
          ? getRemainingSeconds({
              deadlineMs: snapshot.deadlineMs,
              nowMs,
            })
          : snapshot.remainingSeconds,
    }))
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs);

  return activeTimers[0] ?? null;
}

export function shouldShowFloatingMiniPlayer({
  activeSessionId,
  dismissedSessionId,
  isMainTimerVisible,
}: MiniPlayerVisibilityInput) {
  return Boolean(activeSessionId) &&
    activeSessionId !== dismissedSessionId &&
    !isMainTimerVisible;
}
