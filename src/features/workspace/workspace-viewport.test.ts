import { describe, expect, it } from "vitest";

import {
  DEFAULT_WORKSPACE_VIEWPORT,
  parseWorkspaceViewport,
} from "./workspace-viewport";

describe("workspace viewport", () => {
  it("parses a persisted viewport with positive or negative coordinates", () => {
    expect(parseWorkspaceViewport({ x: -132.4, y: 87.6 })).toEqual({
      x: -132,
      y: 88,
    });
  });

  it("falls back to the default viewport for invalid stored values", () => {
    expect(parseWorkspaceViewport({ x: "left", y: 20 })).toEqual(
      DEFAULT_WORKSPACE_VIEWPORT,
    );
    expect(parseWorkspaceViewport(null)).toEqual(DEFAULT_WORKSPACE_VIEWPORT);
  });
});
