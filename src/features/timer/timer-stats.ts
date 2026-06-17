const TIMER_STATS_KEY = "deepflow:timer-stats:v1";

export const TIMER_STATS_UPDATED_EVENT = "deepflow:timer-stats-updated";

export type TimerStats = {
  version: 1;
  sessionsToday: number;
  focusMinutesToday: number;
  totalSessions: number;
  totalFocusMinutes: number;
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null;
};

export type CompleteSessionInput = {
  durationMinutes: number;
  completedAtMs?: number;
  countsAsFocus?: boolean;
};

const emptyStats: TimerStats = {
  version: 1,
  sessionsToday: 0,
  focusMinutesToday: 0,
  totalSessions: 0,
  totalFocusMinutes: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastCompletedDate: null,
};

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function localDateKey(timestampMs: number) {
  const date = new Date(timestampMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKeyToLocalTime(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day).getTime();
}

function daysBetween(startDateKey: string, endDateKey: string) {
  const startMs = dateKeyToLocalTime(startDateKey);
  const endMs = dateKeyToLocalTime(endDateKey);
  if (startMs === null || endMs === null) return null;

  return Math.round((endMs - startMs) / 86_400_000);
}

function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeStats(stats: TimerStats, nowMs = Date.now()): TimerStats {
  const today = localDateKey(nowMs);
  const dayGap = stats.lastCompletedDate
    ? daysBetween(stats.lastCompletedDate, today)
    : null;
  const shouldResetToday =
    stats.lastCompletedDate !== null && stats.lastCompletedDate !== today;
  const currentStreak =
    dayGap !== null && dayGap > 1 ? 0 : stats.currentStreak;

  return {
    ...stats,
    sessionsToday: shouldResetToday ? 0 : stats.sessionsToday,
    focusMinutesToday: shouldResetToday ? 0 : stats.focusMinutesToday,
    currentStreak,
  };
}

function parseStats(value: unknown): TimerStats | null {
  if (!value || typeof value !== "object") return null;

  const stats = value as Partial<TimerStats>;
  if (
    stats.version !== 1 ||
    !isFiniteNonNegative(stats.sessionsToday) ||
    !isFiniteNonNegative(stats.focusMinutesToday) ||
    !isFiniteNonNegative(stats.totalSessions) ||
    !isFiniteNonNegative(stats.totalFocusMinutes) ||
    !isFiniteNonNegative(stats.currentStreak) ||
    !isFiniteNonNegative(stats.bestStreak) ||
    (stats.lastCompletedDate !== null &&
      stats.lastCompletedDate !== undefined &&
      !isDateKey(stats.lastCompletedDate))
  ) {
    return null;
  }

  return {
    version: 1,
    sessionsToday: Math.floor(stats.sessionsToday),
    focusMinutesToday: Math.floor(stats.focusMinutesToday),
    totalSessions: Math.floor(stats.totalSessions),
    totalFocusMinutes: Math.floor(stats.totalFocusMinutes),
    currentStreak: Math.floor(stats.currentStreak),
    bestStreak: Math.floor(stats.bestStreak),
    lastCompletedDate: stats.lastCompletedDate ?? null,
  };
}

export function loadStats(nowMs = Date.now()): TimerStats {
  if (!canUseStorage()) return emptyStats;

  try {
    const raw = window.localStorage.getItem(TIMER_STATS_KEY);
    if (!raw) return emptyStats;

    const parsed = parseStats(JSON.parse(raw));
    if (!parsed) return emptyStats;

    return normalizeStats(parsed, nowMs);
  } catch {
    return emptyStats;
  }
}

export function saveStats(stats: TimerStats) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(TIMER_STATS_KEY, JSON.stringify(stats));
    window.dispatchEvent(new Event(TIMER_STATS_UPDATED_EVENT));
  } catch {
    // Session stats are useful, but storage issues must not interrupt timers.
  }
}

export function updateStreak(
  stats: TimerStats,
  completedAtMs = Date.now(),
): TimerStats {
  const completedDate = localDateKey(completedAtMs);

  if (stats.lastCompletedDate === completedDate) {
    return {
      ...stats,
      bestStreak: Math.max(stats.bestStreak, stats.currentStreak),
    };
  }

  const dayGap = stats.lastCompletedDate
    ? daysBetween(stats.lastCompletedDate, completedDate)
    : null;
  const currentStreak =
    stats.lastCompletedDate === null
      ? 1
      : dayGap === 1
        ? stats.currentStreak + 1
        : 1;

  return {
    ...stats,
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    lastCompletedDate: completedDate,
  };
}

export function completeSession({
  durationMinutes,
  completedAtMs = Date.now(),
  countsAsFocus = true,
}: CompleteSessionInput): TimerStats {
  const completedDate = localDateKey(completedAtMs);
  const currentStats = loadStats(completedAtMs);
  const isFirstSessionToday = currentStats.lastCompletedDate !== completedDate;
  const normalizedDuration = Math.max(0, Math.round(durationMinutes));
  const nextStatsBase: TimerStats = {
    ...currentStats,
    sessionsToday: currentStats.sessionsToday + 1,
    focusMinutesToday: countsAsFocus
      ? currentStats.focusMinutesToday + normalizedDuration
      : currentStats.focusMinutesToday,
    totalSessions: currentStats.totalSessions + 1,
    totalFocusMinutes: countsAsFocus
      ? currentStats.totalFocusMinutes + normalizedDuration
      : currentStats.totalFocusMinutes,
    lastCompletedDate: currentStats.lastCompletedDate,
  };
  const nextStats = isFirstSessionToday
    ? updateStreak(nextStatsBase, completedAtMs)
    : {
        ...nextStatsBase,
        lastCompletedDate: completedDate,
        bestStreak: Math.max(
          nextStatsBase.bestStreak,
          nextStatsBase.currentStreak,
        ),
      };

  saveStats(nextStats);
  return nextStats;
}
