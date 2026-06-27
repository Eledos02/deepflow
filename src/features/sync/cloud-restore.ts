import type { SupabaseClient } from "@supabase/supabase-js";

import { readLocalSyncSnapshot, type LocalSyncSnapshot } from "./cloud-sync";
import {
  WEEKLY_GOAL_LOCAL_ID,
  mapLocalFocusSessionsToCloudRows,
} from "./local-to-cloud-mappers";
import { hasStoredWorkspaceGoal } from "./local-data-migration";
import {
  mergeCloudGoalIntoLocal,
  mergeCloudRoutinesIntoLocal,
  mergeCloudSessionsIntoLocal,
} from "./cloud-sync";
import type {
  CloudFocusGoalRecord,
  CloudFocusRoutineRecord,
  CloudFocusSessionRecord,
} from "./sync-types";

export const CLOUD_RESTORE_KEY_PREFIX = "deepflow:cloud-restore:v1";

export type CloudRestoreStatus =
  | "not_checked"
  | "available"
  | "restoring"
  | "completed"
  | "dismissed"
  | "error";

export type CloudRestoreSummary = {
  sessionsAvailable: number;
  routinesAvailable: number;
  goalAvailable: boolean;
  hasData: boolean;
};

export type CloudRestoreSnapshot = {
  sessions: CloudFocusSessionRecord[];
  goal: CloudFocusGoalRecord | null;
  routines: CloudFocusRoutineRecord[];
};

export type StoredCloudRestoreState = {
  status: Exclude<CloudRestoreStatus, "available">;
  completedAt?: string;
  dismissedAt?: string;
  error?: string;
};

export type CloudRestoreState = {
  status: CloudRestoreStatus;
  summary: CloudRestoreSummary;
  completedAt: string | null;
  dismissedAt: string | null;
  error: string | null;
};

export type CloudRestoreResult =
  | {
      ok: true;
      status: "completed";
      summary: CloudRestoreSummary;
      restored: {
        sessions: number;
        routines: number;
        goal: number;
      };
    }
  | {
      ok: false;
      status: "error";
      error: string;
      summary: CloudRestoreSummary;
    };

type RestoreCloudDataOptions = {
  supabase: SupabaseClient;
  userId: string;
  cloudData?: CloudRestoreSnapshot;
  localData?: LocalSyncSnapshot;
  hasStoredGoal?: boolean;
};

const summaryUserId = "00000000-0000-4000-8000-000000000000";

const emptySummary: CloudRestoreSummary = {
  sessionsAvailable: 0,
  routinesAvailable: 0,
  goalAvailable: false,
  hasData: false,
};

const emptySnapshot: CloudRestoreSnapshot = {
  sessions: [],
  goal: null,
  routines: [],
};

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function summarizeSupabaseError(error: { message?: string; code?: string } | null) {
  if (!error) return "Cloud restore failed.";
  return [error.code, error.message].filter(Boolean).join(": ").slice(0, 240);
}

function normalizeStoredState(value: unknown): StoredCloudRestoreState {
  if (!value || typeof value !== "object") return { status: "not_checked" };

  const state = value as Partial<StoredCloudRestoreState>;
  const status =
    state.status === "restoring" ||
    state.status === "completed" ||
    state.status === "dismissed" ||
    state.status === "error"
      ? state.status
      : "not_checked";

  return {
    status,
    completedAt:
      typeof state.completedAt === "string" ? state.completedAt : undefined,
    dismissedAt:
      typeof state.dismissedAt === "string" ? state.dismissedAt : undefined,
    error: typeof state.error === "string" ? state.error : undefined,
  };
}

function normalizeSessionRows(value: unknown): CloudFocusSessionRecord[] {
  return Array.isArray(value)
    ? value.filter((row): row is CloudFocusSessionRecord =>
        Boolean(
          row &&
            typeof row === "object" &&
            typeof (row as Partial<CloudFocusSessionRecord>).local_id === "string" &&
            typeof (row as Partial<CloudFocusSessionRecord>).completed_at === "string" &&
            typeof (row as Partial<CloudFocusSessionRecord>).duration_minutes === "number",
        ),
      )
    : [];
}

function normalizeRoutineRows(value: unknown): CloudFocusRoutineRecord[] {
  return Array.isArray(value)
    ? value.filter((row): row is CloudFocusRoutineRecord =>
        Boolean(
          row &&
            typeof row === "object" &&
            typeof (row as Partial<CloudFocusRoutineRecord>).local_id === "string" &&
            typeof (row as Partial<CloudFocusRoutineRecord>).name === "string" &&
            typeof (row as Partial<CloudFocusRoutineRecord>).duration_minutes === "number",
        ),
      )
    : [];
}

function normalizeGoalRow(value: unknown): CloudFocusGoalRecord | null {
  if (!value || typeof value !== "object") return null;

  const row = value as Partial<CloudFocusGoalRecord>;
  if (
    row.local_id !== WEEKLY_GOAL_LOCAL_ID ||
    typeof row.weekly_sessions_target !== "number" ||
    typeof row.weekly_minutes_target !== "number"
  ) {
    return null;
  }

  return row as CloudFocusGoalRecord;
}

export function getCloudRestoreStorageKey(userId: string) {
  return `${CLOUD_RESTORE_KEY_PREFIX}:${userId}`;
}

export function readCloudRestoreState(userId: string): StoredCloudRestoreState {
  if (!canUseStorage()) return { status: "not_checked" };

  try {
    const raw = window.localStorage.getItem(getCloudRestoreStorageKey(userId));
    return raw ? normalizeStoredState(JSON.parse(raw)) : { status: "not_checked" };
  } catch {
    return { status: "not_checked" };
  }
}

export function writeCloudRestoreState(
  userId: string,
  state: StoredCloudRestoreState,
) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      getCloudRestoreStorageKey(userId),
      JSON.stringify(normalizeStoredState(state)),
    );
  } catch {
    // Restore state is UX-only. Cloud and local data remain intact if this fails.
  }
}

export function getCloudRestoreSummary({
  cloudData = emptySnapshot,
  localData = readLocalSyncSnapshot(),
  hasStoredGoal = hasStoredWorkspaceGoal(),
  userId = summaryUserId,
}: {
  cloudData?: CloudRestoreSnapshot;
  localData?: LocalSyncSnapshot;
  hasStoredGoal?: boolean;
  userId?: string;
} = {}): CloudRestoreSummary {
  const localSessionIds = new Set(
    mapLocalFocusSessionsToCloudRows({
      completedSessions: localData.completedSessions,
      journalEntries: localData.journalEntries,
      stats: localData.stats,
      userId,
    }).map((row) => row.local_id),
  );
  const localRoutineIds = new Set(localData.routines.map((routine) => routine.id));
  const sessionsAvailable = cloudData.sessions.filter(
    (session) => !localSessionIds.has(session.local_id),
  ).length;
  const routinesAvailable = cloudData.routines.filter(
    (routine) => !localRoutineIds.has(routine.local_id),
  ).length;
  const goalAvailable = Boolean(cloudData.goal && !hasStoredGoal);

  return {
    sessionsAvailable,
    routinesAvailable,
    goalAvailable,
    hasData: sessionsAvailable > 0 || routinesAvailable > 0 || goalAvailable,
  };
}

export function getEffectiveCloudRestoreState({
  storedState,
  summary = emptySummary,
}: {
  storedState: StoredCloudRestoreState;
  summary?: CloudRestoreSummary;
}): CloudRestoreState {
  const status =
    storedState.status === "restoring" ||
    storedState.status === "completed" ||
    storedState.status === "dismissed" ||
    storedState.status === "error"
      ? storedState.status
      : summary.hasData
        ? "available"
        : "not_checked";

  return {
    status,
    summary,
    completedAt: storedState.completedAt ?? null,
    dismissedAt: storedState.dismissedAt ?? null,
    error: storedState.error ?? null,
  };
}

export async function fetchCloudRestoreSnapshot({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<
  | { ok: true; data: CloudRestoreSnapshot }
  | { ok: false; error: string; data: CloudRestoreSnapshot }
> {
  const { data: sessions, error: sessionsError } = await supabase
    .from("focus_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(200);

  if (sessionsError) {
    return {
      ok: false,
      error: summarizeSupabaseError(sessionsError),
      data: emptySnapshot,
    };
  }

  const { data: goal, error: goalError } = await supabase
    .from("focus_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("local_id", WEEKLY_GOAL_LOCAL_ID)
    .maybeSingle();

  if (goalError) {
    return {
      ok: false,
      error: summarizeSupabaseError(goalError),
      data: emptySnapshot,
    };
  }

  const { data: routines, error: routinesError } = await supabase
    .from("focus_routines")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (routinesError) {
    return {
      ok: false,
      error: summarizeSupabaseError(routinesError),
      data: emptySnapshot,
    };
  }

  return {
    ok: true,
    data: {
      sessions: normalizeSessionRows(sessions),
      goal: normalizeGoalRow(goal),
      routines: normalizeRoutineRows(routines),
    },
  };
}

export async function restoreCloudDataToDevice({
  supabase,
  userId,
  cloudData,
  localData = readLocalSyncSnapshot(),
  hasStoredGoal = hasStoredWorkspaceGoal(),
}: RestoreCloudDataOptions): Promise<CloudRestoreResult> {
  const cloudSnapshot = cloudData
    ? { ok: true as const, data: cloudData }
    : await fetchCloudRestoreSnapshot({ supabase, userId });

  if (!cloudSnapshot.ok) {
    return {
      ok: false,
      status: "error",
      error: cloudSnapshot.error,
      summary: emptySummary,
    };
  }

  const summary = getCloudRestoreSummary({
    cloudData: cloudSnapshot.data,
    localData,
    hasStoredGoal,
    userId,
  });

  if (!summary.hasData) {
    return {
      ok: true,
      status: "completed",
      summary,
      restored: { sessions: 0, routines: 0, goal: 0 },
    };
  }

  const sessionIds = new Set(
    mapLocalFocusSessionsToCloudRows({
      completedSessions: localData.completedSessions,
      journalEntries: localData.journalEntries,
      stats: localData.stats,
      userId,
    }).map((row) => row.local_id),
  );
  const routineIds = new Set(localData.routines.map((routine) => routine.id));
  const sessionsToRestore = cloudSnapshot.data.sessions.filter(
    (session) => !sessionIds.has(session.local_id),
  );
  const routinesToRestore = cloudSnapshot.data.routines.filter(
    (routine) => !routineIds.has(routine.local_id),
  );

  return {
    ok: true,
    status: "completed",
    summary,
    restored: {
      sessions: mergeCloudSessionsIntoLocal(sessionsToRestore),
      routines: mergeCloudRoutinesIntoLocal(routinesToRestore),
      goal: !hasStoredGoal ? mergeCloudGoalIntoLocal(cloudSnapshot.data.goal) : 0,
    },
  };
}
