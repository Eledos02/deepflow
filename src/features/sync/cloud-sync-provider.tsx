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
import {
  fetchCloudRestoreSnapshot,
  getEffectiveCloudRestoreState,
  getCloudRestoreSummary,
  readCloudRestoreState,
  restoreCloudDataToDevice,
  writeCloudRestoreState,
  type CloudRestoreState,
} from "./cloud-restore";
import {
  getEffectiveLocalDataMigrationState,
  getLocalDataMigrationSummary,
  readLocalDataMigrationState,
  saveLocalDataToAccount,
  writeLocalDataMigrationState,
  type LocalDataMigrationState,
} from "./local-data-migration";
import { getCloudSyncStatusLabel } from "./sync-status";
import type { CloudSyncStatus } from "./sync-types";

type CloudSyncContextValue = {
  status: CloudSyncStatus;
  statusLabel: string;
  isAvailable: boolean;
  isAuthenticated: boolean;
  migration: LocalDataMigrationState;
  restore: CloudRestoreState;
  syncNow: () => Promise<void>;
  saveDeviceDataToAccount: () => Promise<void>;
  restoreCloudData: () => Promise<void>;
  dismissCloudRestore: () => void;
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

const emptyMigrationState: LocalDataMigrationState = {
  status: "not_started",
  summary: {
    sessionsFound: 0,
    routinesFound: 0,
    goalFound: false,
    hasData: false,
  },
  completedAt: null,
  error: null,
};

const emptyRestoreState: CloudRestoreState = {
  status: "not_checked",
  summary: {
    sessionsAvailable: 0,
    routinesAvailable: 0,
    goalAvailable: false,
    hasData: false,
  },
  completedAt: null,
  dismissedAt: null,
  error: null,
};

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const { isConfigured, user } = useAuth();
  const isAvailable = Boolean(getSupabaseBrowserConfig()) && isConfigured;
  const [status, setStatus] = useState<CloudSyncStatus>(() => ({
    state: isAvailable ? "idle" : "offline/local-only",
    lastSyncedAt: null,
    error: null,
  }));
  const [migration, setMigration] = useState<LocalDataMigrationState>(
    emptyMigrationState,
  );
  const [restore, setRestore] = useState<CloudRestoreState>(emptyRestoreState);
  const syncTimeoutRef = useRef<number | null>(null);
  const isSyncingRef = useRef(false);
  const isMigratingRef = useRef(false);
  const isRestoringRef = useRef(false);

  const refreshMigration = useCallback(() => {
    if (!user) {
      setMigration(emptyMigrationState);
      return;
    }

    setMigration(
      getEffectiveLocalDataMigrationState({
        storedState: readLocalDataMigrationState(user.id),
        summary: getLocalDataMigrationSummary({ userId: user.id }),
      }),
    );
  }, [user]);

  const refreshRestore = useCallback(async () => {
    if (!user || !isAvailable) {
      setRestore(emptyRestoreState);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setRestore(emptyRestoreState);
      return;
    }

    const cloudSnapshot = await fetchCloudRestoreSnapshot({
      supabase,
      userId: user.id,
    });

    if (!cloudSnapshot.ok) {
      setRestore({
        ...emptyRestoreState,
        status: "error",
        error: cloudSnapshot.error,
      });
      return;
    }

    setRestore(
      getEffectiveCloudRestoreState({
        storedState: readCloudRestoreState(user.id),
        summary: getCloudRestoreSummary({
          cloudData: cloudSnapshot.data,
          userId: user.id,
        }),
      }),
    );
  }, [isAvailable, user]);

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
        setMigration(emptyMigrationState);
        setRestore(emptyRestoreState);
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
        refreshMigration();
        void refreshRestore();
      }, 0);
      return () => window.clearTimeout(resetId);
    }

    const initialSyncId = window.setTimeout(() => {
      refreshMigration();
      void refreshRestore();
      void runSync();
    }, 500);

    return () => window.clearTimeout(initialSyncId);
  }, [isAvailable, refreshMigration, refreshRestore, runSync, user]);

  useEffect(() => {
    if (!user) return;

    const handleLocalDataUpdated = () => {
      refreshMigration();
      void refreshRestore();
      if (!isAvailable) return;
      scheduleSync();
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || !localDataStorageKeys.has(event.key)) return;
      handleLocalDataUpdated();
    };

    for (const eventName of localDataEvents) {
      window.addEventListener(eventName, handleLocalDataUpdated);
    }
    window.addEventListener("storage", handleStorage);

    return () => {
      if (syncTimeoutRef.current !== null) {
        window.clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }

      for (const eventName of localDataEvents) {
        window.removeEventListener(eventName, handleLocalDataUpdated);
      }
      window.removeEventListener("storage", handleStorage);
    };
  }, [isAvailable, refreshMigration, refreshRestore, scheduleSync, user]);

  const saveDeviceDataToAccount = useCallback(async () => {
    if (!isAvailable || !user || isMigratingRef.current) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const summary = getLocalDataMigrationSummary({ userId: user.id });
    if (!summary.hasData) {
      setMigration({
        status: "not_started",
        summary,
        completedAt: null,
        error: null,
      });
      return;
    }

    isMigratingRef.current = true;
    writeLocalDataMigrationState(user.id, { status: "saving" });
    setMigration({
      status: "saving",
      summary,
      completedAt: null,
      error: null,
    });

    const result = await saveLocalDataToAccount({
      supabase,
      userId: user.id,
    });

    isMigratingRef.current = false;

    if (result.ok) {
      const completedAt = new Date().toISOString();
      writeLocalDataMigrationState(user.id, {
        status: "completed",
        completedAt,
      });
      setMigration({
        status: "completed",
        summary: getLocalDataMigrationSummary({ userId: user.id }),
        completedAt,
        error: null,
      });
      setStatus({
        state: "synced",
        lastSyncedAt: completedAt,
        error: null,
      });
      void refreshRestore();
      return;
    }

    writeLocalDataMigrationState(user.id, {
      status: "error",
      error: result.error,
    });
    setMigration({
      status: "error",
      summary,
      completedAt: null,
      error: result.error,
    });
    setStatus((currentStatus) => ({
      state: "error",
      lastSyncedAt: currentStatus.lastSyncedAt,
      error: result.error,
    }));
  }, [isAvailable, refreshRestore, user]);

  const restoreCloudData = useCallback(async () => {
    if (!isAvailable || !user || isRestoringRef.current) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    isRestoringRef.current = true;
    writeCloudRestoreState(user.id, { status: "restoring" });
    setRestore((currentRestore) => ({
      ...currentRestore,
      status: "restoring",
      error: null,
    }));

    const result = await restoreCloudDataToDevice({
      supabase,
      userId: user.id,
    });

    isRestoringRef.current = false;

    if (result.ok) {
      const completedAt = new Date().toISOString();
      writeCloudRestoreState(user.id, {
        status: "completed",
        completedAt,
      });
      setRestore({
        status: "completed",
        summary: result.summary,
        completedAt,
        dismissedAt: null,
        error: null,
      });
      setStatus({
        state: "synced",
        lastSyncedAt: completedAt,
        error: null,
      });
      refreshMigration();
      return;
    }

    writeCloudRestoreState(user.id, {
      status: "error",
      error: result.error,
    });
    setRestore({
      status: "error",
      summary: result.summary,
      completedAt: null,
      dismissedAt: null,
      error: result.error,
    });
  }, [isAvailable, refreshMigration, user]);

  const dismissCloudRestore = useCallback(() => {
    if (!user) return;

    const dismissedAt = new Date().toISOString();
    writeCloudRestoreState(user.id, {
      status: "dismissed",
      dismissedAt,
    });
    setRestore((currentRestore) => ({
      ...currentRestore,
      status: "dismissed",
      dismissedAt,
      error: null,
    }));
  }, [user]);

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
    migration,
    restore,
    syncNow: runSync,
    saveDeviceDataToAccount,
    restoreCloudData,
    dismissCloudRestore,
    deleteRoutineFromCloud,
  }), [
    deleteRoutineFromCloud,
    dismissCloudRestore,
    isAvailable,
    migration,
    restore,
    restoreCloudData,
    runSync,
    saveDeviceDataToAccount,
    status,
    user,
  ]);

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
