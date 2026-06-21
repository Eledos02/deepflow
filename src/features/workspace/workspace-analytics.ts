import type { FocusJournalEntry } from "@/features/timer/focus-journal";
import type { TimerStats } from "@/features/timer/timer-stats";

const DAY_MS = 86_400_000;
export const MIN_FOCUS_PATTERN_SESSIONS = 3;
const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type FocusMomentumState = "rising" | "stable" | "slowing";

export type WeeklyFocusActivity = {
  dateKey: string;
  label: string;
  minutes: number;
};

export type FocusStreaks = {
  currentStreak: number;
  bestStreak: number;
};

export type FocusMomentum = {
  state: FocusMomentumState;
  hasBaseline: boolean;
  percentChange: number;
  currentMinutes: number;
  previousMinutes: number;
};

export type WorkspaceAnalytics = {
  totalFocusMinutes: number;
  totalSessions: number;
  currentStreak: number;
  bestStreak: number;
  sessionsToday: number;
  averageSessionLength: number;
  longestSessionLength: number;
  focusMinutesThisWeek: number;
  sessionsLastSevenDays: number;
  focusMinutesLastSevenDays: number;
  activeFocusDaysLastSevenDays: number;
  weekdayFocusMinutesLastSevenDays: number;
  weekendFocusMinutesLastSevenDays: number;
  focusEntryCount: number;
  recentFocusEntryCount: number;
  hasEnoughFocusPatternData: boolean;
  hasEnoughRecentFocusPatternData: boolean;
  weeklyActivity: WeeklyFocusActivity[];
  momentum: FocusMomentum;
  bestFocusDay: string | null;
  bestFocusHour: string | null;
  bestFocusDayLastSevenDays: string | null;
  bestFocusHourLastSevenDays: string | null;
  bestFocusHourIndexLastSevenDays: number | null;
};

function isValidFocusEntry(entry: FocusJournalEntry) {
  return (
    Number.isFinite(entry.durationMinutes) &&
    entry.durationMinutes > 0 &&
    !Number.isNaN(Date.parse(entry.completedAt))
  );
}

function localDateKey(value: number | string | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromLocalKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfLocalDay(nowMs: number) {
  const date = new Date(nowMs);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function startOfLocalWeek(nowMs: number) {
  const date = new Date(startOfLocalDay(nowMs));
  const daysSinceMonday = date.getDay() === 0 ? 6 : date.getDay() - 1;
  date.setDate(date.getDate() - daysSinceMonday);
  return date.getTime();
}

function addLocalDays(startMs: number, days: number) {
  const date = new Date(startMs);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

function sumFocusMinutes(entries: FocusJournalEntry[]) {
  return entries.reduce((total, entry) => total + entry.durationMinutes, 0);
}

function getAnalyticsFocusEntries(
  entries: FocusJournalEntry[],
  stats: TimerStats,
) {
  // Journal entries are the current source of truth; legacy stats history
  // fills gaps for sessions completed before the Focus Journal existed.
  const journalEntries = getValidFocusJournalEntries(entries);
  const knownSessionKeys = new Set(
    journalEntries.map(
      (entry) => `${entry.completedAt}:${entry.durationMinutes}`,
    ),
  );
  const historyEntries = stats.sessionHistory.flatMap((entry, index) => {
    const sessionKey = `${entry.completedAt}:${entry.durationMinutes}`;
    if (
      knownSessionKeys.has(sessionKey) ||
      !Number.isFinite(entry.durationMinutes) ||
      entry.durationMinutes <= 0 ||
      Number.isNaN(Date.parse(entry.completedAt))
    ) {
      return [];
    }

    knownSessionKeys.add(sessionKey);
    return [
      {
        id: `session-history-${index}-${sessionKey}`,
        title: entry.timerType,
        intention: "",
        durationMinutes: entry.durationMinutes,
        timerType: entry.timerType,
        completedAt: entry.completedAt,
        sourcePath: entry.path,
      },
    ];
  });

  return [...journalEntries, ...historyEntries];
}

function entriesInRange(
  entries: FocusJournalEntry[],
  startMs: number,
  endMs: number,
) {
  return entries.filter((entry) => {
    const completedAtMs = Date.parse(entry.completedAt);
    return completedAtMs >= startMs && completedAtMs <= endMs;
  });
}

function weekdayIndex(value: string) {
  const day = new Date(value).getDay();
  return day === 0 ? 6 : day - 1;
}

export function getValidFocusJournalEntries(entries: FocusJournalEntry[]) {
  return entries.filter(isValidFocusEntry);
}

export function getCurrentWeekFocusEntries(
  entries: FocusJournalEntry[],
  nowMs = Date.now(),
) {
  return entriesInRange(
    getValidFocusJournalEntries(entries),
    startOfLocalWeek(nowMs),
    nowMs,
  );
}

export function getLastSevenDaysFocusEntries(
  entries: FocusJournalEntry[],
  nowMs = Date.now(),
) {
  return entriesInRange(
    getValidFocusJournalEntries(entries),
    addLocalDays(startOfLocalDay(nowMs), -6),
    nowMs,
  );
}

export function getWeeklyFocusActivity(
  entries: FocusJournalEntry[],
  nowMs = Date.now(),
): WeeklyFocusActivity[] {
  const weekStartMs = startOfLocalWeek(nowMs);
  const minutesByDate = new Map<string, number>();

  for (const entry of getCurrentWeekFocusEntries(entries, nowMs)) {
    const dateKey = localDateKey(entry.completedAt);
    minutesByDate.set(
      dateKey,
      (minutesByDate.get(dateKey) ?? 0) + entry.durationMinutes,
    );
  }

  return WEEKDAY_LABELS.map((label, index) => {
    const dateKey = localDateKey(addLocalDays(weekStartMs, index));
    return {
      dateKey,
      label,
      minutes: minutesByDate.get(dateKey) ?? 0,
    };
  });
}

export function calculateFocusStreaks(
  entries: FocusJournalEntry[],
  nowMs = Date.now(),
): FocusStreaks {
  const dateKeys = [...new Set(
    getValidFocusJournalEntries(entries)
      .filter((entry) => Date.parse(entry.completedAt) <= nowMs)
      .map((entry) => localDateKey(entry.completedAt)),
  )].sort();

  if (dateKeys.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  let bestStreak = 1;
  let runningStreak = 1;

  for (let index = 1; index < dateKeys.length; index += 1) {
    const previousMs = dateFromLocalKey(dateKeys[index - 1]).getTime();
    const currentMs = dateFromLocalKey(dateKeys[index]).getTime();
    const daysApart = Math.round((currentMs - previousMs) / DAY_MS);

    runningStreak = daysApart === 1 ? runningStreak + 1 : 1;
    bestStreak = Math.max(bestStreak, runningStreak);
  }

  const completedDays = new Set(dateKeys);
  let cursorMs = startOfLocalDay(nowMs);
  if (!completedDays.has(localDateKey(cursorMs))) {
    cursorMs = addLocalDays(cursorMs, -1);
  }

  let currentStreak = 0;
  while (completedDays.has(localDateKey(cursorMs))) {
    currentStreak += 1;
    cursorMs = addLocalDays(cursorMs, -1);
  }

  return { currentStreak, bestStreak };
}

export function calculateFocusMomentum(
  entries: FocusJournalEntry[],
  nowMs = Date.now(),
): FocusMomentum {
  const validEntries = getValidFocusJournalEntries(entries);
  const currentStartMs = addLocalDays(startOfLocalDay(nowMs), -6);
  const previousStartMs = addLocalDays(currentStartMs, -7);
  const currentMinutes = sumFocusMinutes(
    entriesInRange(validEntries, currentStartMs, nowMs),
  );
  const previousMinutes = sumFocusMinutes(
    entriesInRange(validEntries, previousStartMs, currentStartMs - 1),
  );
  const hasBaseline = previousMinutes > 0;

  if (!hasBaseline) {
    return {
      state: "stable",
      hasBaseline: false,
      percentChange: 0,
      currentMinutes,
      previousMinutes,
    };
  }

  const percentChange =
    Math.round(((currentMinutes - previousMinutes) / previousMinutes) * 100);
  const state: FocusMomentumState =
    percentChange > 10 ? "rising" : percentChange < -10 ? "slowing" : "stable";

  return {
    state,
    hasBaseline: true,
    percentChange,
    currentMinutes,
    previousMinutes,
  };
}

export function getBestFocusDay(
  entries: FocusJournalEntry[],
  minimumSessions = MIN_FOCUS_PATTERN_SESSIONS,
) {
  const validEntries = getValidFocusJournalEntries(entries);
  if (validEntries.length < minimumSessions) return null;

  const minutesByDay = Array.from({ length: 7 }, () => 0);
  const latestCompletionByDay = Array.from({ length: 7 }, () => 0);

  for (const entry of validEntries) {
    const index = weekdayIndex(entry.completedAt);
    minutesByDay[index] += entry.durationMinutes;
    latestCompletionByDay[index] = Math.max(
      latestCompletionByDay[index],
      Date.parse(entry.completedAt),
    );
  }

  const highestMinutes = Math.max(...minutesByDay);
  if (highestMinutes === 0) return null;

  const strongestDayIndex = minutesByDay.reduce(
    (strongestIndex, minutes, index) => {
      if (minutes > minutesByDay[strongestIndex]) return index;
      if (
        minutes === minutesByDay[strongestIndex] &&
        latestCompletionByDay[index] > latestCompletionByDay[strongestIndex]
      ) {
        return index;
      }
      return strongestIndex;
    },
    0,
  );

  return WEEKDAY_LABELS[strongestDayIndex];
}

export function getBestFocusHour(
  entries: FocusJournalEntry[],
  minimumSessions = MIN_FOCUS_PATTERN_SESSIONS,
) {
  const hour = getBestFocusHourIndex(entries, minimumSessions);
  if (hour === null) return null;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2026, 0, 1, hour));
}

export function getBestFocusHourIndex(
  entries: FocusJournalEntry[],
  minimumSessions = MIN_FOCUS_PATTERN_SESSIONS,
) {
  const validEntries = getValidFocusJournalEntries(entries);
  if (validEntries.length < minimumSessions) return null;

  const minutesByHour = Array.from({ length: 24 }, () => 0);
  const latestCompletionByHour = Array.from({ length: 24 }, () => 0);

  for (const entry of validEntries) {
    const hour = new Date(entry.completedAt).getHours();
    minutesByHour[hour] += entry.durationMinutes;
    latestCompletionByHour[hour] = Math.max(
      latestCompletionByHour[hour],
      Date.parse(entry.completedAt),
    );
  }

  const highestMinutes = Math.max(...minutesByHour);
  if (highestMinutes === 0) return null;

  return minutesByHour.reduce((strongestHour, minutes, hour) => {
    if (minutes > minutesByHour[strongestHour]) return hour;
    if (
      minutes === minutesByHour[strongestHour] &&
      latestCompletionByHour[hour] > latestCompletionByHour[strongestHour]
    ) {
      return hour;
    }
    return strongestHour;
  }, 0);
}

export function calculateWorkspaceAnalytics(
  entries: FocusJournalEntry[],
  stats: TimerStats,
  nowMs = Date.now(),
): WorkspaceAnalytics {
  const validEntries = getAnalyticsFocusEntries(entries, stats);
  const journalMinutes = sumFocusMinutes(validEntries);
  const journalStreaks = calculateFocusStreaks(validEntries, nowMs);
  const totalFocusMinutes = Math.max(stats.totalFocusMinutes, journalMinutes);
  const totalSessions = Math.max(stats.totalSessions, validEntries.length);
  const weeklyActivity = getWeeklyFocusActivity(validEntries, nowMs);
  const lastSevenDaysEntries = getLastSevenDaysFocusEntries(validEntries, nowMs);
  const activeFocusDaysLastSevenDays = new Set(
    lastSevenDaysEntries.map((entry) => localDateKey(entry.completedAt)),
  ).size;
  const weekendFocusMinutesLastSevenDays = lastSevenDaysEntries.reduce(
    (total, entry) =>
      weekdayIndex(entry.completedAt) >= 5
        ? total + entry.durationMinutes
        : total,
    0,
  );
  const weekdayFocusMinutesLastSevenDays =
    sumFocusMinutes(lastSevenDaysEntries) - weekendFocusMinutesLastSevenDays;
  const focusEntryCount = validEntries.length;
  const recentFocusEntryCount = lastSevenDaysEntries.length;

  return {
    totalFocusMinutes,
    totalSessions,
    currentStreak: stats.currentStreak || journalStreaks.currentStreak,
    bestStreak: Math.max(stats.bestStreak, journalStreaks.bestStreak),
    sessionsToday: stats.sessionsToday,
    averageSessionLength:
      totalSessions > 0 ? Math.round(totalFocusMinutes / totalSessions) : 0,
    longestSessionLength: validEntries.reduce(
      (longest, entry) => Math.max(longest, entry.durationMinutes),
      0,
    ),
    focusMinutesThisWeek: weeklyActivity.reduce(
      (total, day) => total + day.minutes,
      0,
    ),
    sessionsLastSevenDays: lastSevenDaysEntries.length,
    focusMinutesLastSevenDays: sumFocusMinutes(lastSevenDaysEntries),
    activeFocusDaysLastSevenDays,
    weekdayFocusMinutesLastSevenDays,
    weekendFocusMinutesLastSevenDays,
    focusEntryCount,
    recentFocusEntryCount,
    hasEnoughFocusPatternData:
      focusEntryCount >= MIN_FOCUS_PATTERN_SESSIONS,
    hasEnoughRecentFocusPatternData:
      recentFocusEntryCount >= MIN_FOCUS_PATTERN_SESSIONS,
    weeklyActivity,
    momentum: calculateFocusMomentum(validEntries, nowMs),
    bestFocusDay: getBestFocusDay(validEntries),
    bestFocusHour: getBestFocusHour(validEntries),
    bestFocusDayLastSevenDays: getBestFocusDay(lastSevenDaysEntries),
    bestFocusHourLastSevenDays: getBestFocusHour(lastSevenDaysEntries),
    bestFocusHourIndexLastSevenDays: getBestFocusHourIndex(lastSevenDaysEntries),
  };
}
