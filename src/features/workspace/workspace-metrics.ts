import type { FocusJournalEntry } from "@/features/timer/focus-journal";
import type { TimerStats } from "@/features/timer/timer-stats";
import { getScopedLocalDataStorageKey } from "../sync/local-data-scope";

export const WORKSPACE_WEEKLY_GOAL_STORAGE_KEY =
  "deepflow:workspace-weekly-goal:v1";
export const WORKSPACE_WEEKLY_GOAL_UPDATED_EVENT =
  "deepflow:workspace-weekly-goal-updated";

export function getWorkspaceWeeklyGoalStorageKey() {
  return getScopedLocalDataStorageKey("focus_goal");
}

export const DEFAULT_WORKSPACE_WEEKLY_GOAL = {
  sessions: 10,
  minutes: 250,
} satisfies WorkspaceWeeklyGoal;

export type WorkspaceWeeklyGoal = {
  sessions: number;
  minutes: number;
};

export type WorkspaceMetrics = {
  totalFocusSessions: number;
  totalFocusMinutes: number;
  sessionsToday: number;
  currentStreak: number;
  bestStreak: number;
  sessionsThisWeek: number;
  focusMinutesThisWeek: number;
  averageSessionLength: number;
  longestSessionMinutes: number;
  mostProductiveDay: string | null;
};

export type WorkspaceGoalProgress = {
  goal: WorkspaceWeeklyGoal;
  progressPercent: number;
  sessionProgressPercent: number;
  minuteProgressPercent: number;
  sessionsThisWeek: number;
  focusMinutesThisWeek: number;
  remainingSessions: number;
  remainingMinutes: number;
};

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function isFinitePositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
  );
}

function normalizeGoal(goal: Partial<WorkspaceWeeklyGoal>): WorkspaceWeeklyGoal {
  return {
    sessions: isFinitePositiveInteger(goal.sessions)
      ? Math.min(goal.sessions, 999)
      : DEFAULT_WORKSPACE_WEEKLY_GOAL.sessions,
    minutes: isFinitePositiveInteger(goal.minutes)
      ? Math.min(goal.minutes, 99_999)
      : DEFAULT_WORKSPACE_WEEKLY_GOAL.minutes,
  };
}

function startOfLocalWeek(nowMs: number) {
  const date = new Date(nowMs);
  const day = date.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysSinceMonday);

  return date.getTime();
}

function dayLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(
    new Date(value),
  );
}

export function getCurrentWeekJournalEntries(
  entries: FocusJournalEntry[],
  nowMs = Date.now(),
) {
  const weekStartMs = startOfLocalWeek(nowMs);

  return entries.filter((entry) => {
    const completedAtMs = Date.parse(entry.completedAt);
    return completedAtMs >= weekStartMs && completedAtMs <= nowMs;
  });
}

export function calculateWorkspaceMetrics(
  entries: FocusJournalEntry[],
  stats: TimerStats,
  nowMs = Date.now(),
): WorkspaceMetrics {
  const validEntries = entries.filter(
    (entry) =>
      Number.isFinite(entry.durationMinutes) && entry.durationMinutes > 0,
  );
  const weekEntries = getCurrentWeekJournalEntries(validEntries, nowMs);
  const totalJournalMinutes = validEntries.reduce(
    (total, entry) => total + entry.durationMinutes,
    0,
  );
  const weekMinutes = weekEntries.reduce(
    (total, entry) => total + entry.durationMinutes,
    0,
  );
  const minutesByDay = new Map<string, number>();

  for (const entry of weekEntries) {
    const dayKey = new Date(entry.completedAt).toDateString();
    minutesByDay.set(
      dayKey,
      (minutesByDay.get(dayKey) ?? 0) + entry.durationMinutes,
    );
  }

  const [mostProductiveDay] = [...minutesByDay.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0] ?? [null, 0];

  const totalFocusMinutes = Math.max(
    totalJournalMinutes,
    stats.totalFocusMinutes,
  );
  const totalFocusSessions = Math.max(validEntries.length, stats.totalSessions);

  return {
    totalFocusSessions,
    totalFocusMinutes,
    sessionsToday: stats.sessionsToday,
    currentStreak: stats.currentStreak,
    bestStreak: stats.bestStreak,
    sessionsThisWeek: weekEntries.length,
    focusMinutesThisWeek: weekMinutes,
    averageSessionLength:
      totalFocusSessions > 0
        ? Math.round(totalFocusMinutes / totalFocusSessions)
        : 0,
    longestSessionMinutes: validEntries.reduce(
      (longest, entry) => Math.max(longest, entry.durationMinutes),
      0,
    ),
    mostProductiveDay: mostProductiveDay ? dayLabel(mostProductiveDay) : null,
  };
}

export function calculateWorkspaceGoalProgress(
  entries: FocusJournalEntry[],
  goal: WorkspaceWeeklyGoal,
  nowMs = Date.now(),
): WorkspaceGoalProgress {
  const normalizedGoal = normalizeGoal(goal);
  const weekEntries = getCurrentWeekJournalEntries(entries, nowMs);
  const sessionsThisWeek = weekEntries.length;
  const focusMinutesThisWeek = weekEntries.reduce(
    (total, entry) => total + entry.durationMinutes,
    0,
  );
  const sessionProgressPercent = Math.min(
    100,
    Math.round((sessionsThisWeek / normalizedGoal.sessions) * 100),
  );
  const minuteProgressPercent = Math.min(
    100,
    Math.round((focusMinutesThisWeek / normalizedGoal.minutes) * 100),
  );

  return {
    goal: normalizedGoal,
    progressPercent: Math.max(sessionProgressPercent, minuteProgressPercent),
    sessionProgressPercent,
    minuteProgressPercent,
    sessionsThisWeek,
    focusMinutesThisWeek,
    remainingSessions: Math.max(0, normalizedGoal.sessions - sessionsThisWeek),
    remainingMinutes: Math.max(0, normalizedGoal.minutes - focusMinutesThisWeek),
  };
}

export function parseWorkspaceWeeklyGoal(
  value: unknown,
): WorkspaceWeeklyGoal {
  if (!value || typeof value !== "object") {
    return DEFAULT_WORKSPACE_WEEKLY_GOAL;
  }

  return normalizeGoal(value as Partial<WorkspaceWeeklyGoal>);
}

export function readWorkspaceWeeklyGoal(): WorkspaceWeeklyGoal {
  if (!canUseStorage()) return DEFAULT_WORKSPACE_WEEKLY_GOAL;

  try {
    const raw = window.localStorage.getItem(getWorkspaceWeeklyGoalStorageKey());
    if (!raw) return DEFAULT_WORKSPACE_WEEKLY_GOAL;
    return parseWorkspaceWeeklyGoal(JSON.parse(raw));
  } catch {
    return DEFAULT_WORKSPACE_WEEKLY_GOAL;
  }
}

export function saveWorkspaceWeeklyGoal(goal: WorkspaceWeeklyGoal) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      getWorkspaceWeeklyGoalStorageKey(),
      JSON.stringify(normalizeGoal(goal)),
    );
    window.dispatchEvent(new Event(WORKSPACE_WEEKLY_GOAL_UPDATED_EVENT));
  } catch {
    // Workspace goals are local-first and should never block the workspace UI.
  }
}
