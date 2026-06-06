export type TimerSnapshot = {
  deadlineMs: number;
  nowMs: number;
};

export function getRemainingSeconds({
  deadlineMs,
  nowMs,
}: TimerSnapshot): number {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

export function getProgress(remainingSeconds: number, totalSeconds: number) {
  if (totalSeconds <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - remainingSeconds / totalSeconds));
}
