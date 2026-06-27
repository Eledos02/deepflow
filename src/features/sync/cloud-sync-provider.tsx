"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/features/auth/auth-provider";
import {
  FOCUS_JOURNAL_STORAGE_KEY,
  FOCUS_JOURNAL_UPDATED_EVENT,
} from "@/features/timer/focus-journal";
import {
  TIMER_ANALYTICS_UPDATED_EVENT,
} from "@/features/timer/timer-storage";
import {
  TIMER_STATS_UPDATED_EVENT,
} from "@/features/timer/timer-stats";
import {
  WORKSPACE_WEEKLY_GOAL_STORAGE_KEY,
  WORKSPACE_WEEKLY_GOAL_UPDATED_EVENT,
} from "@/features/workspace/workspace-metrics";
import {
  WORKSPACE_ROUTINES_STORAGE_KEY,
  WORKSPACE_ROUTINES_UPDATED_EVENT,
} from "@/features/workspace/workspace-routines";
import {
  getSupabaseBrowserClient,
  getSupabaseBrowserConfig,
} from "@/lib/supabase/browser";

import {
  deleteCloudRoutine,
  syncDeepFlowData,
} from "./cloud-sync";
import { getCloudSyncStatusLabel } from "./sync-status";
import type { CloudSyncStatus } from "./sync-types";

type CloudSyncContextValue = {
  status: CloudSyncStatus;
  statusLabel: string;
  isAvailable: boolean;
  isAuthenticated: boolean;
  syncNow: () => Promise<void>;
  deleteRoutineFromCloud: (localId: string) => Promise<void>;
};

const CloudSyncContext = createContext<CloudSyncContextValue | null>(null);

const localDataEvents = [
  TIMER_ANALYTICS_UPDATED_EVENT,
  TIMER_STATS_UPDATED_EVENT,
  FOCUS_JOURNAL_UPDATED_EVENT,
  WORKSPACE_WEEKLY_GOAL_UPDATED_EVENT,
  WORKSPACE_ROUTINES_UPDATED_EVENT,
] as const;

const localDataStorageKeys = new Set([
  "deepflow:completed-sessions:v1",
  "deepflow:timer-stats:v1",
  FOCUS_JOURNAL_STORAGE_KEY,
  WORKSPACE_WEEKLY_GOAL_STORAGE_KEY,
  WORKSPACE_ROUTINES_STORAGE_KEY,
]);

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const { isConfigured, user } = useAuth();
  const isAvailable = Boolean(getSupabaseBrowserConfig()) && isConfigured;
  const [status, setStatus] = useState<CloudSyncStatus>(() => ({
    state: isAvailable ? "idle" : "offline/local-only",
    lastSyncedAt: null,
    error: null,
  }));
  const syncTimeoutRef = useRef<number | null>(null);
  const isSyncingRef = useRef(false);

  const runSync = useCallback(async () => {
    if (!isAvailable || !user) {
      setStatus((currentStatus) => ({
        ...currentStatus,
        state: "offline/local-only",
        error: null,
      }));
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase || isSyncingRef.current) return;

    isSyncingRef.current = true;
    setStatus((currentStatus) => ({
      ...currentStatus,
      state: "syncing",
      error: null,
    }));

    const result = await syncDeepFlowData({
      supabase,
      userId: user.id,
    });

    isSyncingRef.current = false;

    if (result.ok) {
      setStatus({
        state: "synced",
        lastSyncedAt: new Date().toISOString(),
        error: null,
      });
      return;
    }

    setStatus((currentStatus) => ({
      state: "error",
      lastSyncedAt: currentStatus.lastSyncedAt,
      error: result.error,
    }));
  }, [isAvailable, user]);

  const scheduleSync = useCallback(() => {
    if (!user || !isAvailable) return;
    if (syncTimeoutRef.current !== null) {
      window.clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = window.setTimeout(() => {
      syncTimeoutRef.current = null;
      void runSync();
    }, 1_500);
  }, [isAvailable, runSync, user]);

  useEffect(() => {
    if (!user) {
      const resetId = window.setTimeout(() => {
        setStatus({
          state: "offline/local-only",
          lastSyncedAt: null,
          error: null,
        });
      }, 0);
      return () => window.clearTimeout(resetId);
    }

    if (!isAvailable) {
      const resetId = window.setTimeout(() => {
        setStatus({
          state: "offline/local-only",
          lastSyncedAt: null,
          error: null,
        });
      }, 0);
      return () => window.clearTimeout(resetId);
    }

    const initialSyncId = window.setTimeout(() => {
      void runSync();
    }, 500);

    return () => window.clearTimeout(initialSyncId);
  }, [isAvailable, runSync, user]);

  useEffect(() => {
    if (!user || !isAvailable) return;

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || !localDataStorageKeys.has(event.key)) return;
      scheduleSync();
    };

    for (const eventName of localDataEvents) {
      window.addEventListener(eventName, scheduleSync);
    }
    window.addEventListener("storage", handleStorage);

    return () => {
      if (syncTimeoutRef.current !== null) {
        window.clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }

      for (const eventName of localDataEvents) {
        window.removeEventListener(eventName, scheduleSync);
      }
      window.removeEventListener("storage", handleStorage);
    };
  }, [isAvailable, scheduleSync, user]);

  const deleteRoutineFromCloud = useCallback(
    async (localId: string) => {
      if (!isAvailable || !user) return;
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const result = await deleteCloudRoutine({
        supabase,
        userId: user.id,
        localId,
      });

      if (!result.ok) {
        setStatus((currentStatus) => ({
          state: "error",
          lastSyncedAt: currentStatus.lastSyncedAt,
          error: result.error,
        }));
      }
    },
    [isAvailable, user],
  );

  const value = useMemo<CloudSyncContextValue>(() => ({
    status,
    statusLabel: getCloudSyncStatusLabel(status.state),
    isAvailable,
    isAuthenticated: Boolean(user),
    syncNow: runSync,
    deleteRoutineFromCloud,
  }), [deleteRoutineFromCloud, isAvailable, runSync, status, user]);

  return (
    <CloudSyncContext.Provider value={value}>
      {children}
    </CloudSyncContext.Provider>
  );
}

export function useCloudSync() {
  const value = useContext(CloudSyncContext);
  if (!value) throw new Error("useCloudSync must be used within CloudSyncProvider");
  return value;
}
