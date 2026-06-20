import { describe, expect, it } from "vitest";

import {
  DEFAULT_WORKSPACE_VIEWPORT,
  MAX_WORKSPACE_ZOOM,
  MIN_WORKSPACE_ZOOM,
  clampWorkspaceZoom,
  parseWorkspaceViewport,
  resetWorkspaceViewport,
  zoomWorkspaceViewport,
} from "./workspace-viewport";

describe("workspace viewport", () => {
  it("parses a persisted viewport with positive or negative coordinates", () => {
    expect(parseWorkspaceViewport({ x: -132.4, y: 87.6 })).toEqual({
      x: -132,
      y: 88,
      zoom: 1,
    });
  });

  it("persists a clamped zoom level when one is present", () => {
    expect(parseWorkspaceViewport({ x: 40, y: -20, zoom: 1.37 })).toEqual({
      x: 40,
      y: -20,
      zoom: 1.37,
    });
    expect(clampWorkspaceZoom(0.2)).toBe(MIN_WORKSPACE_ZOOM);
    expect(clampWorkspaceZoom(3)).toBe(MAX_WORKSPACE_ZOOM);
  });

  it("anchors viewport zoom around the chosen point and resets safely", () => {
    expect(
      zoomWorkspaceViewport(
        { x: 0, y: 0, zoom: 1 },
        2,
        { x: 120, y: 80 },
      ),
    ).toEqual({ x: -120, y: -80, zoom: 2 });
    expect(resetWorkspaceViewport()).toEqual(DEFAULT_WORKSPACE_VIEWPORT);
  });

  it("falls back to the default viewport for invalid stored values", () => {
    expect(parseWorkspaceViewport({ x: "left", y: 20 })).toEqual(
      DEFAULT_WORKSPACE_VIEWPORT,
    );
    expect(parseWorkspaceViewport(null)).toEqual(DEFAULT_WORKSPACE_VIEWPORT);
  });
});
