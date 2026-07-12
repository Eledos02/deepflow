import { describe, expect, it } from "vitest";

import {
  DEFAULT_WORKSPACE_VIEWPORT,
  MAX_WORKSPACE_ZOOM,
  MIN_WORKSPACE_ZOOM,
  clampWorkspaceZoom,
  parseWorkspaceViewport,
  resetWorkspaceViewport,
  startWorkspacePinchGesture,
  updateWorkspacePinchGesture,
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

  it("starts a two-pointer pinch with the world point beneath its centroid", () => {
    expect(
      startWorkspacePinchGesture(
        [
          { pointerId: 3, x: 100, y: 100 },
          { pointerId: 7, x: 200, y: 100 },
        ],
        { x: -40, y: 20, zoom: 1 },
      ),
    ).toEqual({
      initialCentroid: { x: 150, y: 100 },
      initialDistance: 100,
      initialViewport: { x: -40, y: 20, zoom: 1 },
      pointerIds: [3, 7],
      worldFocalPoint: { x: 190, y: 80 },
    });
  });

  it("combines pinch zoom and centroid pan while keeping the focal point stable", () => {
    const gesture = startWorkspacePinchGesture(
      [
        { pointerId: 3, x: 100, y: 100 },
        { pointerId: 7, x: 200, y: 100 },
      ],
      { x: -40, y: 20, zoom: 1 },
    );

    expect(gesture).not.toBeNull();
    expect(
      updateWorkspacePinchGesture(gesture!, [
        { pointerId: 3, x: 100, y: 100 },
        { pointerId: 7, x: 300, y: 100 },
      ]),
    ).toEqual({ x: -180, y: -60, zoom: 2 });
    expect(
      updateWorkspacePinchGesture(gesture!, [
        { pointerId: 3, x: 130, y: 140 },
        { pointerId: 7, x: 230, y: 140 },
      ]),
    ).toEqual({ x: -10, y: 60, zoom: 1 });
  });

  it("clamps pinch zoom and ignores incomplete pointer pairs", () => {
    const gesture = startWorkspacePinchGesture(
      [
        { pointerId: 1, x: 0, y: 0 },
        { pointerId: 2, x: 100, y: 0 },
      ],
      DEFAULT_WORKSPACE_VIEWPORT,
    );

    expect(gesture).not.toBeNull();
    expect(
      updateWorkspacePinchGesture(gesture!, [
        { pointerId: 1, x: 0, y: 0 },
        { pointerId: 2, x: 500, y: 0 },
      ])?.zoom,
    ).toBe(MAX_WORKSPACE_ZOOM);
    expect(
      updateWorkspacePinchGesture(gesture!, [
        { pointerId: 1, x: 0, y: 0 },
      ]),
    ).toBeNull();
  });
});
