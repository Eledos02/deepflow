import { describe, expect, it } from "vitest";

import { MAX_FREE_WORKSPACE_CONNECTIONS } from "./workspace-connections";
import { FREE_WORKSPACE_LIMITS } from "./workspace-limits";
import { MAX_FREE_WORKSPACE_NOTES } from "./workspace-notes";

describe("Free workspace limits", () => {
  it("uses one shared limit configuration", () => {
    expect(FREE_WORKSPACE_LIMITS).toEqual({ notes: 5, connections: 5 });
    expect(MAX_FREE_WORKSPACE_NOTES).toBe(FREE_WORKSPACE_LIMITS.notes);
    expect(MAX_FREE_WORKSPACE_CONNECTIONS).toBe(
      FREE_WORKSPACE_LIMITS.connections,
    );
  });
});
