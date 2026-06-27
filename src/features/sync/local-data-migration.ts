import type { SupabaseClient } from "@supabase/supabase-js";

import {
  readLocalSyncSnapshot,
  syncDeepFlowData,
  type LocalSyncSnapshot,
} from "./cloud-sync";
import { mapLocalFocusSessionsToCloudRows } from "./local-to-cloud-mappers";
import type { CloudSyncResult } from "./sync-types";
import {
  getWorkspaceWeeklyGoalStorageKey,
} from "../workspace/workspace-metrics";

export const LOCAL_DATA_MIGRATION_KEY_PREFIX =
  "deepflow:cloud-migration:v1";

export type LocalDataMigrationStatus =
  | "not_started"
  | "available"
  | "saving"
  | "completed"
  | "error";

export type LocalDataMigrationSummary = {
  sessionsFound: number;
  routinesFound: number;
  goalFound: boolean;
  hasData: boolean;
};

export type StoredLocalDataMigrationState = {
  status: Exclude<LocalDataMigrationStatus, "available">;
  completedAt?: string;
  error?: string;
};

export type LocalDataMigrationState = {
  status: LocalDataMigrationStatus;
  summary: LocalDataMigrationSummary;
  completedAt: string | null;
  error: string | null;
};

type SaveLocalDataToAccountOptions = {
  supabase: SupabaseClient;
  userId: string;
  localData?: LocalSyncSnapshot;
  hasStoredGoal?: boolean;
};

const summaryUserId = "00000000-0000-4000-8000-000000000000";

const emptySummary: LocalDataMigrationSummary = {
  sessionsFound: 0,
  routinesFound: 0,
  goalFound: false,
  hasData: false,
};

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function normalizeStoredState(
  value: unknown,
): StoredLocalDataMigrationState {
  if (!value || typeof value !== "object") {
    return { status: "not_started" };
  }

  const state = value as Partial<StoredLocalDataMigrationState>;
  const status =
    state.status === "saving" ||
    state.status === "completed" ||
    state.status === "error"
      ? state.status
      : "not_started";

  return {
    status,
    completedAt:
      typeof state.completedAt === "string" ? state.completedAt : undefined,
    error: typeof state.error === "string" ? state.error : undefined,
  };
}

export function getLocalDataMigrationStorageKey(userId: string) {
  return `${LOCAL_DATA_MIGRATION_KEY_PREFIX}:${userId}`;
}

export function hasStoredWorkspaceGoal() {
  if (!canUseStorage()) return false;
  return window.localStorage.getItem(getWorkspaceWeeklyGoalStorageKey()) !== null;
}

export function getLocalDataMigrationSummary({
  localData = readLocalSyncSnapshot(),
  hasStoredGoal = hasStoredWorkspaceGoal(),
  userId = summaryUserId,
}: {
  localData?: LocalSyncSnapshot;
  hasStoredGoal?: boolean;
  userId?: string;
} = {}): LocalDataMigrationSummary {
  const sessionsFound = mapLocalFocusSessionsToCloudRows({
    completedSessions: localData.completedSessions,
    journalEntries: localData.journalEntries,
    stats: localData.stats,
    userId,
  }).length;
  const routinesFound = localData.routines.length;

  return {
    sessionsFound,
    routinesFound,
    goalFound: hasStoredGoal,
    hasData: sessionsFound > 0 || routinesFound > 0 || hasStoredGoal,
  };
}

export function readLocalDataMigrationState(
  userId: string,
): StoredLocalDataMigrationState {
  if (!canUseStorage()) return { status: "not_started" };

  try {
    const raw = window.localStorage.getItem(
      getLocalDataMigrationStorageKey(userId),
    );
    return raw ? normalizeStoredState(JSON.parse(raw)) : { status: "not_started" };
  } catch {
    return { status: "not_started" };
  }
}

export function writeLocalDataMigrationState(
  userId: string,
  state: StoredLocalDataMigrationState,
) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      getLocalDataMigrationStorageKey(userId),
      JSON.stringify(normalizeStoredState(state)),
    );
  } catch {
    // Migration state is UX-only. Local data remains intact if this fails.
  }
}

export function getEffectiveLocalDataMigrationState({
  storedState,
  summary = emptySummary,
}: {
  storedState: StoredLocalDataMigrationState;
  summary?: LocalDataMigrationSummary;
}): LocalDataMigrationState {
  const status =
    storedState.status === "completed" ||
    storedState.status === "saving" ||
    storedState.status === "error"
      ? storedState.status
      : summary.hasData
        ? "available"
        : "not_started";

  return {
    status,
    summary,
    completedAt: storedState.completedAt ?? null,
    error: storedState.error ?? null,
  };
}

export async function saveLocalDataToAccount({
  supabase,
  userId,
  localData = readLocalSyncSnapshot(),
  hasStoredGoal = hasStoredWorkspaceGoal(),
}: SaveLocalDataToAccountOptions): Promise<CloudSyncResult> {
  return syncDeepFlowData({
    supabase,
    userId,
    localData,
    mergeCloudToLocal: false,
    syncGoal: hasStoredGoal,
  });
}
