import type { TimerKind } from "@/content/timer-tools";

export function shouldCountAsFocusSession(
  timerKind: TimerKind,
  durationSeconds: number,
) {
  if (timerKind === "pomodoro") {
    return durationSeconds === 25 * 60;
  }

  return timerKind === "focus" || timerKind === "countdown";
}
