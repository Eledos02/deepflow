import type { FocusCategory } from "@/features/timer/timer-storage";
import type { WorkspaceRoutineColor } from "@/features/workspace/workspace-routines";

export type CloudSyncState =
  | "idle"
  | "syncing"
  | "synced"
  | "error"
  | "offline/local-only";

export type CloudSyncStatus = {
  state: CloudSyncState;
  lastSyncedAt: string | null;
  error: string | null;
};

export type CloudSyncSummary = {
  focusSessions: number;
  goals: number;
  routines: number;
  pulledFocusSessions: number;
  pulledRoutines: number;
};

export type CloudSyncResult =
  | {
      ok: true;
      status: "synced";
      summary: CloudSyncSummary;
    }
  | {
      ok: false;
      status: "error";
      error: string;
      summary: CloudSyncSummary;
    };

export type CloudFocusSessionRow = {
  user_id: string;
  local_id: string;
  title: string | null;
  intention: string | null;
  category: FocusCategory | null;
  duration_minutes: number;
  completed_at: string;
  source: string;
  routine_id: string | null;
};

export type CloudFocusGoalRow = {
  user_id: string;
  local_id: string;
  weekly_sessions_target: number;
  weekly_minutes_target: number;
};

export type CloudFocusRoutineRow = {
  user_id: string;
  local_id: string;
  name: string;
  duration_minutes: number;
  intention: string | null;
  color: WorkspaceRoutineColor | null;
  created_at: string;
  updated_at: string;
};

export type CloudFocusSessionRecord = CloudFocusSessionRow & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type CloudFocusGoalRecord = CloudFocusGoalRow & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type CloudFocusRoutineRecord = CloudFocusRoutineRow & {
  id?: string;
};
