import type { CloudSyncState } from "./sync-types";

export function getCloudSyncStatusLabel(state: CloudSyncState) {
  if (state === "syncing") return "Syncing...";
  if (state === "synced") return "Synced to your DeepFlow account.";
  if (state === "error") return "Saved locally. Cloud sync will retry.";
  if (state === "offline/local-only") return "Saved locally on this device.";
  return "Cloud sync ready.";
}

export function getCloudSyncCardState(
  state: CloudSyncState,
  isAuthenticated: boolean,
) {
  if (!isAuthenticated) return "Local-first";
  if (state === "syncing") return "Syncing";
  if (state === "synced") return "Synced";
  if (state === "error") return "Needs attention";
  return "Local-first";
}
