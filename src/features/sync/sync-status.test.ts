import { describe, expect, it } from "vitest";

import {
  getCloudSyncCardState,
  getCloudSyncStatusLabel,
} from "./sync-status";

describe("sync status copy", () => {
  it("keeps guest users local-first", () => {
    expect(getCloudSyncCardState("offline/local-only", false)).toBe("Local-first");
    expect(getCloudSyncStatusLabel("offline/local-only")).toBe(
      "Saved locally on this device.",
    );
  });

  it("uses calm authenticated sync states", () => {
    expect(getCloudSyncCardState("synced", true)).toBe("Synced");
    expect(getCloudSyncCardState("syncing", true)).toBe("Syncing");
    expect(getCloudSyncCardState("error", true)).toBe("Needs attention");
    expect(getCloudSyncStatusLabel("error")).toBe(
      "Saved locally. Cloud sync will retry.",
    );
  });
});
