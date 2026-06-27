import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createFocusJournalEntry,
  readFocusJournalEntries,
  saveFocusJournalEntry,
  type FocusJournalEntry,
} from "../timer/focus-journal";
import {
  loadStats,
  type TimerStats,
} from "../timer/timer-stats";
import {
  readCompletedSessions,
  saveCompletedSession,
  type CompletedTimerSession,
} from "../timer/timer-storage";
import {
  WORKSPACE_WEEKLY_GOAL_STORAGE_KEY,
  readWorkspaceWeeklyGoal,
  saveWorkspaceWeeklyGoal,
  type WorkspaceWeeklyGoal,
} from "../workspace/workspace-metrics";
import {
  canCreateWorkspaceRoutine,
  createWorkspaceRoutine,
  readWorkspaceRoutines,
  writeWorkspaceRoutines,
  type WorkspaceRoutine,
} from "../workspace/workspace-routines";

import {
  WEEKLY_GOAL_LOCAL_ID,
  mapLocalFocusSessionsToCloudRows,
  mapWorkspaceGoalToCloudRow,
  mapWorkspaceRoutinesToCloudRows,
} from "./local-to-cloud-mappers";
import type {
  CloudFocusGoalRecord,
  CloudFocusRoutineRecord,
  CloudFocusSessionRecord,
  CloudSyncResult,
  CloudSyncSummary,
} from "./sync-types";

export type LocalSyncSnapshot = {
  completedSessions: CompletedTimerSession[];
  journalEntries: FocusJournalEntry[];
  stats: TimerStats;
  goal: WorkspaceWeeklyGoal;
  routines: WorkspaceRoutine[];
};

type SyncDeepFlowDataOptions = {
  supabase: SupabaseClient;
  userId: string;
  localData?: LocalSyncSnapshot;
  mergeCloudToLocal?: boolean;
  syncGoal?: boolean;
};

type DeleteCloudRoutineOptions = {
  supabase: SupabaseClient;
  userId: string;
  localId: string;
};

const emptySummary: CloudSyncSummary = {
  focusSessions: 0,
  goals: 0,
  routines: 0,
  pulledFocusSessions: 0,
  pulledRoutines: 0,
};

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function hasLocalWeeklyGoal() {
  if (!canUseStorage()) return false;
  return window.localStorage.getItem(WORKSPACE_WEEKLY_GOAL_STORAGE_KEY) !== null;
}

export function readLocalSyncSnapshot(): LocalSyncSnapshot {
  return {
    completedSessions: readCompletedSessions(),
    journalEntries: readFocusJournalEntries(),
    stats: loadStats(),
    goal: readWorkspaceWeeklyGoal(),
    routines: readWorkspaceRoutines(),
  };
}

function summarizeSupabaseError(error: { message?: string; code?: string } | null) {
  if (!error) return "Cloud sync failed.";
  return [error.code, error.message].filter(Boolean).join(": ").slice(0, 240);
}

function isCloudSessionRecord(value: unknown): value is CloudFocusSessionRecord {
  if (!value || typeof value !== "object") return false;

  const record = value as Partial<CloudFocusSessionRecord>;
  return (
    typeof record.local_id === "string" &&
    typeof record.completed_at === "string" &&
    typeof record.duration_minutes === "number" &&
    Number.isFinite(record.duration_minutes) &&
    record.duration_minutes > 0
  );
}

function isCloudRoutineRecord(value: unknown): value is CloudFocusRoutineRecord {
  if (!value || typeof value !== "object") return false;

  const record = value as Partial<CloudFocusRoutineRecord>;
  return (
    typeof record.local_id === "string" &&
    typeof record.name === "string" &&
    typeof record.duration_minutes === "number" &&
    Number.isFinite(record.duration_minutes) &&
    record.duration_minutes > 0 &&
    typeof record.created_at === "string" &&
    typeof record.updated_at === "string"
  );
}

function isCloudGoalRecord(value: unknown): value is CloudFocusGoalRecord {
  if (!value || typeof value !== "object") return false;

  const record = value as Partial<CloudFocusGoalRecord>;
  return (
    record.local_id === WEEKLY_GOAL_LOCAL_ID &&
    typeof record.weekly_sessions_target === "number" &&
    typeof record.weekly_minutes_target === "number"
  );
}

export function mergeCloudSessionsIntoLocal(rows: unknown[]) {
  const existingIds = new Set(readCompletedSessions().map((session) => session.id));
  let pulled = 0;

  for (const row of rows) {
    if (!isCloudSessionRecord(row) || existingIds.has(row.local_id)) continue;

    const completedAtMs = Date.parse(row.completed_at);
    if (Number.isNaN(completedAtMs)) continue;

    const timerType = row.source?.trim() || "Focus Timer";

    saveCompletedSession({
      id: row.local_id,
      completedAtMs,
      durationSeconds: Math.max(1, Math.round(row.duration_minutes)) * 60,
      timerKind: "focus",
      countsAsFocus: true,
      timerType,
      path: "/tools/focus-timer",
      taskName: row.intention ?? row.title ?? undefined,
      category: row.category ?? undefined,
      routineId: row.routine_id ?? undefined,
    });

    saveFocusJournalEntry(
      createFocusJournalEntry({
        id: row.local_id,
        intention: row.intention ?? row.title ?? "",
        durationMinutes: row.duration_minutes,
        timerType,
        completedAt: row.completed_at,
        sourcePath: "/tools/focus-timer",
        routineId: row.routine_id ?? undefined,
        routineName: undefined,
      }),
    );

    existingIds.add(row.local_id);
    pulled += 1;
  }

  return pulled;
}

export function mergeCloudGoalIntoLocal(row: unknown) {
  if (!isCloudGoalRecord(row) || hasLocalWeeklyGoal()) return 0;

  saveWorkspaceWeeklyGoal({
    sessions: Math.max(1, Math.round(row.weekly_sessions_target)),
    minutes: Math.max(1, Math.round(row.weekly_minutes_target)),
  });

  return 1;
}

export function mergeCloudRoutinesIntoLocal(rows: unknown[]) {
  const currentRoutines = readWorkspaceRoutines();
  const knownIds = new Set(currentRoutines.map((routine) => routine.id));
  const nextRoutines = [...currentRoutines];
  let pulled = 0;

  for (const row of rows) {
    if (!isCloudRoutineRecord(row) || knownIds.has(row.local_id)) continue;
    if (!canCreateWorkspaceRoutine(nextRoutines)) break;

    const routine = createWorkspaceRoutine({
      id: row.local_id,
      now: row.created_at,
      draft: {
        name: row.name,
        durationMinutes: row.duration_minutes,
        intention: row.intention ?? "",
        color: row.color ?? "warm-cream",
      },
    });

    if (!routine) continue;
    nextRoutines.push({ ...routine, updatedAt: row.updated_at });
    knownIds.add(row.local_id);
    pulled += 1;
  }

  if (pulled > 0) {
    writeWorkspaceRoutines(nextRoutines);
  }

  return pulled;
}

export async function syncDeepFlowData({
  supabase,
  userId,
  localData = readLocalSyncSnapshot(),
  mergeCloudToLocal = false,
  syncGoal = true,
}: SyncDeepFlowDataOptions): Promise<CloudSyncResult> {
  const summary = { ...emptySummary };

  try {
    const focusRows = mapLocalFocusSessionsToCloudRows({
      completedSessions: localData.completedSessions,
      journalEntries: localData.journalEntries,
      stats: localData.stats,
      userId,
    });
    const goalRow = syncGoal
      ? mapWorkspaceGoalToCloudRow(localData.goal, userId)
      : null;
    const routineRows = mapWorkspaceRoutinesToCloudRows(localData.routines, userId);

    if (focusRows.length > 0) {
      const { error } = await supabase
        .from("focus_sessions")
        .upsert(focusRows, { onConflict: "user_id,local_id" });
      if (error) throw new Error(summarizeSupabaseError(error));
      summary.focusSessions = focusRows.length;
    }

    if (goalRow) {
      const { error: goalError } = await supabase
        .from("focus_goals")
        .upsert(goalRow, { onConflict: "user_id,local_id" });
      if (goalError) throw new Error(summarizeSupabaseError(goalError));
      summary.goals = 1;
    }

    if (routineRows.length > 0) {
      const { error } = await supabase
        .from("focus_routines")
        .upsert(routineRows, { onConflict: "user_id,local_id" });
      if (error) throw new Error(summarizeSupabaseError(error));
      summary.routines = routineRows.length;
    }

    if (mergeCloudToLocal) {
      const { data: cloudSessions, error: cloudSessionsError } = await supabase
        .from("focus_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false })
        .limit(200);
      if (cloudSessionsError) throw new Error(summarizeSupabaseError(cloudSessionsError));
      summary.pulledFocusSessions = Array.isArray(cloudSessions)
        ? mergeCloudSessionsIntoLocal(cloudSessions)
        : 0;

      const { data: cloudGoal, error: cloudGoalError } = await supabase
        .from("focus_goals")
        .select("*")
        .eq("user_id", userId)
        .eq("local_id", WEEKLY_GOAL_LOCAL_ID)
        .maybeSingle();
      if (cloudGoalError) throw new Error(summarizeSupabaseError(cloudGoalError));
      mergeCloudGoalIntoLocal(cloudGoal);

      const { data: cloudRoutines, error: cloudRoutinesError } = await supabase
        .from("focus_routines")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(20);
      if (cloudRoutinesError) throw new Error(summarizeSupabaseError(cloudRoutinesError));
      summary.pulledRoutines = Array.isArray(cloudRoutines)
        ? mergeCloudRoutinesIntoLocal(cloudRoutines)
        : 0;
    }

    return { ok: true, status: "synced", summary };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      error: error instanceof Error ? error.message : "Cloud sync failed.",
      summary,
    };
  }
}

export async function deleteCloudRoutine({
  supabase,
  userId,
  localId,
}: DeleteCloudRoutineOptions) {
  const { error } = await supabase
    .from("focus_routines")
    .delete()
    .eq("user_id", userId)
    .eq("local_id", localId);

  if (error) {
    return { ok: false as const, error: summarizeSupabaseError(error) };
  }

  return { ok: true as const };
}
