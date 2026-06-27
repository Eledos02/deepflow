import type { CloudRestoreState } from "./cloud-restore";
import type { LocalDataMigrationState } from "./local-data-migration";
import type { CloudSyncStatus } from "./sync-types";

export const CLOUD_SYNC_HEALTH_KEY_PREFIX = "deepflow:cloud-sync-status:v1";

export type CloudSyncLastStatus = "idle" | "completed" | "error";

export type CloudSyncHealthMetadata = {
  lastCheckedAt: string | null;
  lastSavedAt: string | null;
  lastRestoredAt: string | null;
  lastSaveStatus: CloudSyncLastStatus;
  lastRestoreStatus: CloudSyncLastStatus;
  lastErrorCode: string | null;
  lastCloudSessionsCount: number;
  lastCloudRoutinesCount: number;
  lastCloudGoalFound: boolean;
  lastRestorableSessionsCount: number;
  lastRestorableRoutinesCount: number;
  lastRestorableGoalAvailable: boolean;
};

export type CloudSyncHealthKind =
  | "local-only"
  | "unavailable"
  | "checking"
  | "error"
  | "restore-available"
  | "never-synced"
  | "up-to-date";

export type CloudSyncHealth = {
  kind: CloudSyncHealthKind;
  title: string;
  body: string;
  statusLine: string;
  workspaceStatus: string;
  lastCheckedLabel: string;
  lastSavedLabel: string;
  lastRestoredLabel: string;
  metadata: CloudSyncHealthMetadata;
};

export const emptyCloudSyncHealthMetadata: CloudSyncHealthMetadata = {
  lastCheckedAt: null,
  lastSavedAt: null,
  lastRestoredAt: null,
  lastSaveStatus: "idle",
  lastRestoreStatus: "idle",
  lastErrorCode: null,
  lastCloudSessionsCount: 0,
  lastCloudRoutinesCount: 0,
  lastCloudGoalFound: false,
  lastRestorableSessionsCount: 0,
  lastRestorableRoutinesCount: 0,
  lastRestorableGoalAvailable: false,
};

type DeriveCloudSyncHealthOptions = {
  isAuthenticated: boolean;
  isAvailable: boolean;
  migration: LocalDataMigrationState;
  restore: CloudRestoreState;
  status: CloudSyncStatus;
  metadata: CloudSyncHealthMetadata;
  now?: Date;
};

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function safeTimestamp(value: unknown) {
  if (typeof value !== "string") return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

function normalizeCloudSyncHealthMetadata(
  value: unknown,
): CloudSyncHealthMetadata {
  if (!value || typeof value !== "object") return emptyCloudSyncHealthMetadata;

  const metadata = value as Partial<CloudSyncHealthMetadata>;
  return {
    lastCheckedAt: safeTimestamp(metadata.lastCheckedAt),
    lastSavedAt: safeTimestamp(metadata.lastSavedAt),
    lastRestoredAt: safeTimestamp(metadata.lastRestoredAt),
    lastSaveStatus: metadata.lastSaveStatus === "completed" || metadata.lastSaveStatus === "error"
      ? metadata.lastSaveStatus
      : "idle",
    lastRestoreStatus: metadata.lastRestoreStatus === "completed" || metadata.lastRestoreStatus === "error"
      ? metadata.lastRestoreStatus
      : "idle",
    lastErrorCode: typeof metadata.lastErrorCode === "string"
      ? metadata.lastErrorCode.slice(0, 80)
      : null,
    lastCloudSessionsCount: safeNumber(metadata.lastCloudSessionsCount),
    lastCloudRoutinesCount: safeNumber(metadata.lastCloudRoutinesCount),
    lastCloudGoalFound: metadata.lastCloudGoalFound === true,
    lastRestorableSessionsCount: safeNumber(metadata.lastRestorableSessionsCount),
    lastRestorableRoutinesCount: safeNumber(metadata.lastRestorableRoutinesCount),
    lastRestorableGoalAvailable: metadata.lastRestorableGoalAvailable === true,
  };
}

export function getCloudSyncHealthStorageKey(userId: string) {
  return `${CLOUD_SYNC_HEALTH_KEY_PREFIX}:${userId}`;
}

export function readCloudSyncHealthMetadata(userId: string) {
  if (!canUseStorage()) return emptyCloudSyncHealthMetadata;

  try {
    const raw = window.localStorage.getItem(getCloudSyncHealthStorageKey(userId));
    return raw
      ? normalizeCloudSyncHealthMetadata(JSON.parse(raw))
      : emptyCloudSyncHealthMetadata;
  } catch {
    return emptyCloudSyncHealthMetadata;
  }
}

export function writeCloudSyncHealthMetadata(
  userId: string,
  metadata: CloudSyncHealthMetadata,
) {
  const normalized = normalizeCloudSyncHealthMetadata(metadata);
  if (!canUseStorage()) return normalized;

  try {
    window.localStorage.setItem(
      getCloudSyncHealthStorageKey(userId),
      JSON.stringify(normalized),
    );
  } catch {
    // Health metadata is UI-only. Local and cloud data remain the source of truth.
  }

  return normalized;
}

export function mergeCloudSyncHealthMetadata(
  userId: string,
  metadata: Partial<CloudSyncHealthMetadata>,
) {
  return writeCloudSyncHealthMetadata(userId, {
    ...readCloudSyncHealthMetadata(userId),
    ...metadata,
  });
}

export function formatCloudSyncTime(
  value: string | null,
  now = new Date(),
  locale = "en-US",
) {
  if (!value) return "Never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";

  const differenceMs = Math.abs(now.getTime() - date.getTime());
  if (differenceMs < 60_000) return "Just now";

  const time = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  if (date.toDateString() === now.toDateString()) {
    return `Today, ${time}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${time}`;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatCloudSyncTimeInSentence(
  value: string | null,
  now = new Date(),
  locale = "en-US",
) {
  const label = formatCloudSyncTime(value, now, locale);
  if (label === "Never") return "never";
  if (label === "Just now") return "just now";
  if (label.startsWith("Today, ")) return label.replace("Today, ", "today at ");
  if (label.startsWith("Yesterday, ")) {
    return label.replace("Yesterday, ", "yesterday at ");
  }

  return `on ${label}`;
}

export function deriveCloudSyncHealth({
  isAuthenticated,
  isAvailable,
  migration,
  restore,
  status,
  metadata,
  now = new Date(),
}: DeriveCloudSyncHealthOptions): CloudSyncHealth {
  const normalizedMetadata = normalizeCloudSyncHealthMetadata(metadata);
  const lastCheckedLabel = formatCloudSyncTime(normalizedMetadata.lastCheckedAt, now);
  const lastSavedLabel = formatCloudSyncTime(normalizedMetadata.lastSavedAt, now);
  const lastRestoredLabel = formatCloudSyncTime(normalizedMetadata.lastRestoredAt, now);
  const lastSavedSentence = formatCloudSyncTimeInSentence(
    normalizedMetadata.lastSavedAt,
    now,
  );

  if (!isAuthenticated) {
    return {
      kind: "local-only",
      title: "Local-first",
      body: "Your DeepFlow data stays on this device unless you choose to sign in.",
      statusLine: "Cloud backup is optional.",
      workspaceStatus: "Saved locally on this device.",
      lastCheckedLabel,
      lastSavedLabel,
      lastRestoredLabel,
      metadata: normalizedMetadata,
    };
  }

  if (!isAvailable) {
    return {
      kind: "unavailable",
      title: "Cloud backup unavailable",
      body: "Cloud backup is not configured in this environment. Your local data is safe.",
      statusLine: "Saved locally on this device.",
      workspaceStatus: "Cloud backup unavailable",
      lastCheckedLabel,
      lastSavedLabel,
      lastRestoredLabel,
      metadata: normalizedMetadata,
    };
  }

  if (
    status.state === "error" ||
    restore.status === "error" ||
    normalizedMetadata.lastErrorCode === "check_failed"
  ) {
    return {
      kind: "error",
      title: "Cloud status unavailable",
      body: "Could not check cloud status right now. Your local data is safe.",
      statusLine: "Try again when you are ready.",
      workspaceStatus: "Cloud status unavailable",
      lastCheckedLabel,
      lastSavedLabel,
      lastRestoredLabel,
      metadata: normalizedMetadata,
    };
  }

  if (status.state === "syncing" || migration.status === "saving" || restore.status === "restoring") {
    return {
      kind: "checking",
      title: "Cloud backup",
      body: "Your sessions, routines, and goals can be saved to your DeepFlow account.",
      statusLine: "Checking cloud backup...",
      workspaceStatus: "Checking cloud backup",
      lastCheckedLabel,
      lastSavedLabel,
      lastRestoredLabel,
      metadata: normalizedMetadata,
    };
  }

  if (restore.summary.hasData) {
    return {
      kind: "restore-available",
      title: "Cloud data available",
      body: "DeepFlow found saved focus history in your account that is not on this device yet.",
      statusLine: "Cloud data is available to restore.",
      workspaceStatus: "Cloud data available",
      lastCheckedLabel,
      lastSavedLabel,
      lastRestoredLabel,
      metadata: normalizedMetadata,
    };
  }

  if (migration.summary.hasData && !normalizedMetadata.lastSavedAt && status.state !== "synced") {
    return {
      kind: "never-synced",
      title: "Save this device data",
      body: "Save your local sessions, routines, and goals to your DeepFlow account.",
      statusLine: "This device has local data that has not been saved to cloud yet.",
      workspaceStatus: "Save device data",
      lastCheckedLabel,
      lastSavedLabel,
      lastRestoredLabel,
      metadata: normalizedMetadata,
    };
  }

  return {
    kind: "up-to-date",
    title: "Cloud backup",
    body: "Your sessions, routines, and goals can be saved to your DeepFlow account.",
    statusLine: normalizedMetadata.lastSavedAt
      ? `Saved to cloud ${lastSavedSentence}.`
      : "This device is up to date.",
    workspaceStatus: "Cloud backup up to date",
    lastCheckedLabel,
    lastSavedLabel,
    lastRestoredLabel,
    metadata: normalizedMetadata,
  };
}
