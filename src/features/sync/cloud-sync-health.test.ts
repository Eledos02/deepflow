import { afterEach, describe, expect, it, vi } from "vitest";

import type { CloudRestoreState } from "./cloud-restore";
import {
  deriveCloudSyncHealth,
  emptyCloudSyncHealthMetadata,
  formatCloudSyncTime,
  formatCloudSyncTimeInSentence,
  getCloudSyncHealthStorageKey,
  mergeCloudSyncHealthMetadata,
  readCloudSyncHealthMetadata,
} from "./cloud-sync-health";
import type { LocalDataMigrationState } from "./local-data-migration";
import type { CloudSyncStatus } from "./sync-types";

const userId = "00000000-0000-4000-8000-000000000001";
const now = new Date(2026, 5, 27, 15, 0);
const savedAt = new Date(2026, 5, 27, 14, 41).toISOString();
const restoredAt = new Date(2026, 5, 26, 18, 20).toISOString();

afterEach(() => {
  vi.unstubAllGlobals();
});

function migrationState(
  partial: Partial<LocalDataMigrationState> = {},
): LocalDataMigrationState {
  return {
    status: "not_started",
    summary: {
      sessionsFound: 0,
      routinesFound: 0,
      goalFound: false,
      hasData: false,
    },
    completedAt: null,
    error: null,
    ...partial,
  };
}

function restoreState(partial: Partial<CloudRestoreState> = {}): CloudRestoreState {
  return {
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
    ...partial,
  };
}

function syncStatus(partial: Partial<CloudSyncStatus> = {}): CloudSyncStatus {
  return {
    state: "idle",
    lastSyncedAt: null,
    error: null,
    ...partial,
  };
}

function stubLocalStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };

  vi.stubGlobal("window", { localStorage });
  return values;
}

describe("cloud sync health status", () => {
  it("keeps logged-out account state local-first instead of broken", () => {
    const health = deriveCloudSyncHealth({
      isAuthenticated: false,
      isAvailable: true,
      migration: migrationState(),
      restore: restoreState(),
      status: syncStatus(),
      metadata: emptyCloudSyncHealthMetadata,
      now,
    });

    expect(health.kind).toBe("local-only");
    expect(health.statusLine).toBe("Cloud backup is optional.");
  });

  it("treats authenticated empty local and cloud data as a clean account", () => {
    const health = deriveCloudSyncHealth({
      isAuthenticated: true,
      isAvailable: true,
      migration: migrationState(),
      restore: restoreState(),
      status: syncStatus({ state: "synced" }),
      metadata: {
        ...emptyCloudSyncHealthMetadata,
        lastCheckedAt: now.toISOString(),
      },
      now,
    });

    expect(health.kind).toBe("up-to-date");
    expect(health.title).toBe("This account is clean.");
    expect(health.body).toBe(
      "Your sessions, routines, and goals can be saved when you are ready.",
    );
    expect(health.statusLine).toBe("No cloud backup yet.");
    expect(health.lastCheckedLabel).toBe("Just now");
  });

  it("shows matching local and cloud data as up to date with last saved time", () => {
    const health = deriveCloudSyncHealth({
      isAuthenticated: true,
      isAvailable: true,
      migration: migrationState({
        status: "completed",
        summary: {
          sessionsFound: 2,
          routinesFound: 1,
          goalFound: true,
          hasData: true,
        },
      }),
      restore: restoreState(),
      status: syncStatus({ state: "synced" }),
      metadata: {
        ...emptyCloudSyncHealthMetadata,
        lastSavedAt: savedAt,
        lastCheckedAt: now.toISOString(),
        lastCloudSessionsCount: 2,
        lastCloudRoutinesCount: 1,
        lastCloudGoalFound: true,
      },
      now,
    });

    expect(health.kind).toBe("up-to-date");
    expect(health.title).toBe("Your DeepFlow data is backed up.");
    expect(health.body).toBe("This device is up to date.");
    expect(health.statusLine).toBe("Saved to cloud today at 2:41 PM.");
    expect(health.lastSavedLabel).toBe("Today, 2:41 PM");
  });

  it("manual sync success updates last saved and checked metadata", () => {
    stubLocalStorage({
      [getCloudSyncHealthStorageKey(userId)]: JSON.stringify({
        ...emptyCloudSyncHealthMetadata,
        lastSavedAt: savedAt,
        lastCheckedAt: savedAt,
      }),
    });

    const metadata = mergeCloudSyncHealthMetadata(userId, {
      lastSavedAt: now.toISOString(),
      lastCheckedAt: now.toISOString(),
      lastSaveStatus: "completed",
      lastErrorCode: null,
    });
    const health = deriveCloudSyncHealth({
      isAuthenticated: true,
      isAvailable: true,
      migration: migrationState({
        status: "completed",
        summary: {
          sessionsFound: 1,
          routinesFound: 1,
          goalFound: false,
          hasData: true,
        },
      }),
      restore: restoreState(),
      status: syncStatus({ state: "synced", lastSyncedAt: now.toISOString() }),
      metadata,
      now,
    });

    expect(metadata.lastSavedAt).toBe(now.toISOString());
    expect(metadata.lastCheckedAt).toBe(now.toISOString());
    expect(metadata.lastSaveStatus).toBe("completed");
    expect(health.lastSavedLabel).toBe("Just now");
    expect(health.lastCheckedLabel).toBe("Just now");
    expect(health.statusLine).toBe("Saved to cloud just now.");
  });

  it("Account Cloud Backup status reflects refreshed metadata after sync", () => {
    const before = deriveCloudSyncHealth({
      isAuthenticated: true,
      isAvailable: true,
      migration: migrationState({
        status: "completed",
        summary: {
          sessionsFound: 1,
          routinesFound: 0,
          goalFound: false,
          hasData: true,
        },
      }),
      restore: restoreState(),
      status: syncStatus({ state: "synced", lastSyncedAt: savedAt }),
      metadata: {
        ...emptyCloudSyncHealthMetadata,
        lastSavedAt: savedAt,
        lastCheckedAt: savedAt,
      },
      now,
    });
    const after = deriveCloudSyncHealth({
      isAuthenticated: true,
      isAvailable: true,
      migration: migrationState({
        status: "completed",
        summary: {
          sessionsFound: 1,
          routinesFound: 0,
          goalFound: false,
          hasData: true,
        },
      }),
      restore: restoreState(),
      status: syncStatus({ state: "synced", lastSyncedAt: now.toISOString() }),
      metadata: {
        ...emptyCloudSyncHealthMetadata,
        lastSavedAt: now.toISOString(),
        lastCheckedAt: now.toISOString(),
        lastSaveStatus: "completed",
      },
      now,
    });

    expect(before.statusLine).toBe("Saved to cloud today at 2:41 PM.");
    expect(after.statusLine).toBe("Saved to cloud just now.");
  });

  it("shows restore available when cloud has data missing locally", () => {
    const health = deriveCloudSyncHealth({
      isAuthenticated: true,
      isAvailable: true,
      migration: migrationState(),
      restore: restoreState({
        status: "available",
        summary: {
          sessionsAvailable: 3,
          routinesAvailable: 1,
          goalAvailable: false,
          hasData: true,
        },
      }),
      status: syncStatus({ state: "synced" }),
      metadata: {
        ...emptyCloudSyncHealthMetadata,
        lastCloudSessionsCount: 3,
        lastCloudRoutinesCount: 1,
      },
      now,
    });

    expect(health.kind).toBe("restore-available");
    expect(health.title).toBe("Cloud data available.");
    expect(health.body).toBe(
      "DeepFlow found saved focus history in your account that is not on this device yet.",
    );
    expect(health.workspaceStatus).toBe("Cloud data available");
  });

  it("keeps local counts empty before restore while showing cloud availability", () => {
    const migration = migrationState();
    const health = deriveCloudSyncHealth({
      isAuthenticated: true,
      isAvailable: true,
      migration,
      restore: restoreState({
        status: "available",
        summary: {
          sessionsAvailable: 2,
          routinesAvailable: 1,
          goalAvailable: true,
          hasData: true,
        },
      }),
      status: syncStatus({ state: "synced" }),
      metadata: {
        ...emptyCloudSyncHealthMetadata,
        lastCloudSessionsCount: 2,
        lastCloudRoutinesCount: 1,
        lastCloudGoalFound: true,
      },
      now,
    });

    expect(migration.summary.sessionsFound).toBe(0);
    expect(migration.summary.routinesFound).toBe(0);
    expect(migration.summary.goalFound).toBe(false);
    expect(health.kind).toBe("restore-available");
  });

  it("becomes up to date after explicit restore completes", () => {
    const health = deriveCloudSyncHealth({
      isAuthenticated: true,
      isAvailable: true,
      migration: migrationState({
        status: "completed",
        summary: {
          sessionsFound: 2,
          routinesFound: 1,
          goalFound: true,
          hasData: true,
        },
      }),
      restore: restoreState({
        status: "completed",
        summary: {
          sessionsAvailable: 0,
          routinesAvailable: 0,
          goalAvailable: false,
          hasData: false,
        },
        completedAt: restoredAt,
      }),
      status: syncStatus({ state: "synced" }),
      metadata: {
        ...emptyCloudSyncHealthMetadata,
        lastRestoredAt: restoredAt,
        lastCloudSessionsCount: 2,
        lastCloudRoutinesCount: 1,
        lastCloudGoalFound: true,
      },
      now,
    });

    expect(health.kind).toBe("up-to-date");
    expect(health.lastRestoredLabel).toBe("Yesterday, 6:20 PM");
  });

  it("shows a safe generic error for failed cloud checks", () => {
    const health = deriveCloudSyncHealth({
      isAuthenticated: true,
      isAvailable: true,
      migration: migrationState(),
      restore: restoreState(),
      status: syncStatus(),
      metadata: {
        ...emptyCloudSyncHealthMetadata,
        lastErrorCode: "check_failed",
      },
      now,
    });

    expect(health.kind).toBe("error");
    expect(health.body).toBe("Could not check cloud status right now. Your local data is safe.");
  });

  it("manual sync failure keeps last saved stale and shows safe sync error copy", () => {
    stubLocalStorage({
      [getCloudSyncHealthStorageKey(userId)]: JSON.stringify({
        ...emptyCloudSyncHealthMetadata,
        lastSavedAt: savedAt,
      }),
    });

    const metadata = mergeCloudSyncHealthMetadata(userId, {
      lastCheckedAt: now.toISOString(),
      lastSaveStatus: "error",
      lastErrorCode: "save_failed",
    });
    const health = deriveCloudSyncHealth({
      isAuthenticated: true,
      isAvailable: true,
      migration: migrationState({
        status: "completed",
        summary: {
          sessionsFound: 1,
          routinesFound: 1,
          goalFound: false,
          hasData: true,
        },
      }),
      restore: restoreState(),
      status: syncStatus({ state: "error", lastSyncedAt: savedAt }),
      metadata,
      now,
    });

    expect(metadata.lastSavedAt).toBe(savedAt);
    expect(health.kind).toBe("error");
    expect(health.lastSavedLabel).toBe("Today, 2:41 PM");
    expect(health.lastCheckedLabel).toBe("Just now");
    expect(health.body).toBe(
      "Could not sync right now. Your local data is still safe on this device.",
    );
  });

  it("formats saved, checked, and restored timestamps without raw ISO strings", () => {
    expect(formatCloudSyncTime(now.toISOString(), now)).toBe("Just now");
    expect(formatCloudSyncTime(savedAt, now)).toBe("Today, 2:41 PM");
    expect(formatCloudSyncTime(restoredAt, now)).toBe("Yesterday, 6:20 PM");
    expect(formatCloudSyncTimeInSentence(restoredAt, now)).toBe("yesterday at 6:20 PM");
  });

  it("stores health metadata per user for UI confidence only", () => {
    const values = stubLocalStorage();
    const metadata = mergeCloudSyncHealthMetadata(userId, {
      lastSavedAt: savedAt,
      lastRestoredAt: restoredAt,
      lastCloudSessionsCount: 4,
      lastCloudRoutinesCount: 2,
      lastCloudGoalFound: true,
    });

    expect(getCloudSyncHealthStorageKey(userId)).toBe(
      "deepflow:cloud-sync-status:v1:00000000-0000-4000-8000-000000000001",
    );
    expect(metadata.lastSavedAt).toBe(savedAt);
    expect(readCloudSyncHealthMetadata(userId)).toMatchObject({
      lastSavedAt: savedAt,
      lastRestoredAt: restoredAt,
      lastCloudSessionsCount: 4,
      lastCloudRoutinesCount: 2,
      lastCloudGoalFound: true,
    });
    expect(values.has(getCloudSyncHealthStorageKey("another-user"))).toBe(false);
  });

  it("health check metadata does not imply a save timestamp", () => {
    const health = deriveCloudSyncHealth({
      isAuthenticated: true,
      isAvailable: true,
      migration: migrationState(),
      restore: restoreState(),
      status: syncStatus({ state: "synced" }),
      metadata: {
        ...emptyCloudSyncHealthMetadata,
        lastCheckedAt: now.toISOString(),
        lastCloudSessionsCount: 3,
        lastCloudRoutinesCount: 1,
        lastCloudGoalFound: true,
      },
      now,
    });

    expect(health.lastCheckedLabel).toBe("Just now");
    expect(health.lastSavedLabel).toBe("Never");
  });
});
