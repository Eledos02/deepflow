import type { FocusJournalEntry } from "@/features/timer/focus-journal";
import type {
  TimerSessionHistoryEntry,
  TimerStats,
} from "@/features/timer/timer-stats";
import type {
  CompletedTimerSession,
} from "@/features/timer/timer-storage";
import type { WorkspaceWeeklyGoal } from "@/features/workspace/workspace-metrics";
import type { WorkspaceRoutine } from "@/features/workspace/workspace-routines";

import type {
  CloudFocusGoalRow,
  CloudFocusRoutineRow,
  CloudFocusSessionRow,
} from "./sync-types";

export const WEEKLY_GOAL_LOCAL_ID = "weekly-focus-goal";

function stableHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function stableLocalId(prefix: string, parts: Array<string | number | undefined>) {
  return `${prefix}-${stableHash(parts.filter(Boolean).join("|"))}`;
}

function normalizeText(value: string | undefined, maxLength: number) {
  const text = value?.trim().slice(0, maxLength);
  return text || null;
}

function isPositiveDurationMinutes(value: number) {
  return Number.isFinite(value) && value > 0;
}

function toCompletedAtIso(value: number | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function addUniqueSessionRow(
  rows: CloudFocusSessionRow[],
  seenLocalIds: Set<string>,
  row: CloudFocusSessionRow | null,
) {
  if (!row || seenLocalIds.has(row.local_id)) return;
  seenLocalIds.add(row.local_id);
  rows.push(row);
}

export function mapCompletedTimerSessionToCloudRow(
  session: CompletedTimerSession,
  userId: string,
): CloudFocusSessionRow | null {
  if (
    !session.countsAsFocus ||
    !Number.isFinite(session.durationSeconds) ||
    session.durationSeconds <= 0
  ) {
    return null;
  }

  const completedAt = toCompletedAtIso(session.completedAtMs);
  if (!completedAt) return null;

  const durationMinutes = Math.max(1, Math.round(session.durationSeconds / 60));
  const intention = normalizeText(session.taskName ?? session.intention, 120);
  const timerType = normalizeText(session.timerType, 80);

  return {
    user_id: userId,
    local_id: session.id || stableLocalId("completed", [
      session.completedAtMs,
      session.durationSeconds,
      session.path,
      session.taskName,
    ]),
    title: intention || timerType || "Focus session",
    intention,
    category: session.category ?? null,
    duration_minutes: durationMinutes,
    completed_at: completedAt,
    source: session.timerKind || "timer",
    routine_id: normalizeText(session.routineId, 120),
  };
}

export function mapFocusJournalEntryToCloudRow(
  entry: FocusJournalEntry,
  userId: string,
): CloudFocusSessionRow | null {
  if (!isPositiveDurationMinutes(entry.durationMinutes)) return null;

  const completedAt = toCompletedAtIso(entry.completedAt);
  if (!completedAt) return null;

  return {
    user_id: userId,
    local_id: entry.id || stableLocalId("journal", [
      entry.completedAt,
      entry.durationMinutes,
      entry.title,
      entry.intention,
    ]),
    title: normalizeText(entry.title, 120) || "Focus session",
    intention: normalizeText(entry.intention, 120),
    category: null,
    duration_minutes: Math.max(1, Math.round(entry.durationMinutes)),
    completed_at: completedAt,
    source: normalizeText(entry.timerType, 80) || "focus_journal",
    routine_id: normalizeText(entry.routineId, 120),
  };
}

export function mapTimerHistoryEntryToCloudRow(
  entry: TimerSessionHistoryEntry,
  userId: string,
  index: number,
): CloudFocusSessionRow | null {
  if (!isPositiveDurationMinutes(entry.durationMinutes)) return null;

  const completedAt = toCompletedAtIso(entry.completedAt);
  if (!completedAt) return null;

  const localId = stableLocalId("history", [
    entry.completedAt,
    entry.durationMinutes,
    entry.path,
    entry.timerType,
    index,
  ]);

  return {
    user_id: userId,
    local_id: localId,
    title: normalizeText(entry.timerType, 80) || "Focus session",
    intention: null,
    category: null,
    duration_minutes: Math.max(1, Math.round(entry.durationMinutes)),
    completed_at: completedAt,
    source: "timer_history",
    routine_id: null,
  };
}

export function mapLocalFocusSessionsToCloudRows({
  completedSessions,
  journalEntries,
  stats,
  userId,
}: {
  completedSessions: CompletedTimerSession[];
  journalEntries: FocusJournalEntry[];
  stats: TimerStats;
  userId: string;
}) {
  const rows: CloudFocusSessionRow[] = [];
  const seenLocalIds = new Set<string>();

  for (const entry of journalEntries) {
    addUniqueSessionRow(
      rows,
      seenLocalIds,
      mapFocusJournalEntryToCloudRow(entry, userId),
    );
  }

  for (const session of completedSessions) {
    addUniqueSessionRow(
      rows,
      seenLocalIds,
      mapCompletedTimerSessionToCloudRow(session, userId),
    );
  }

  stats.sessionHistory.forEach((entry, index) => {
    addUniqueSessionRow(
      rows,
      seenLocalIds,
      mapTimerHistoryEntryToCloudRow(entry, userId, index),
    );
  });

  return rows.sort(
    (a, b) => Date.parse(a.completed_at) - Date.parse(b.completed_at),
  );
}

export function mapWorkspaceGoalToCloudRow(
  goal: WorkspaceWeeklyGoal,
  userId: string,
): CloudFocusGoalRow {
  return {
    user_id: userId,
    local_id: WEEKLY_GOAL_LOCAL_ID,
    weekly_sessions_target: Math.max(1, Math.round(goal.sessions)),
    weekly_minutes_target: Math.max(1, Math.round(goal.minutes)),
  };
}

export function mapWorkspaceRoutinesToCloudRows(
  routines: WorkspaceRoutine[],
  userId: string,
): CloudFocusRoutineRow[] {
  return routines.map((routine) => ({
    user_id: userId,
    local_id: routine.id,
    name: routine.name,
    duration_minutes: Math.max(1, Math.round(routine.durationMinutes)),
    intention: normalizeText(routine.intention, 120),
    color: routine.color,
    created_at: routine.createdAt,
    updated_at: routine.updatedAt,
  }));
}
