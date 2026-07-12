import { describe, expect, it } from "vitest";

import {
  canCreateWorkspaceNoteFromShortcut,
  canvasPointToWorkspacePoint,
  getWorkspaceViewportCenterPosition,
} from "./workspace-canvas-utils";

describe("workspace canvas utilities", () => {
  it("converts a canvas click into world coordinates using pan and zoom", () => {
    expect(
      canvasPointToWorkspacePoint(
        { x: 320, y: 180 },
        { x: -80, y: 40, zoom: 1.5 },
      ),
    ).toEqual({ x: 266.6666666666667, y: 93.33333333333333 });
  });

  it.each([
    [0.75, { x: 560, y: 240 }],
    [1, { x: 420, y: 180 }],
    [1.25, { x: 336, y: 144 }],
    [1.5, { x: 280, y: 120 }],
  ])(
    "converts connection pointer coordinates at %s zoom with pan",
    (zoom, expected) => {
      expect(
        canvasPointToWorkspacePoint(
          { x: 370, y: 210 },
          { x: -50, y: 30, zoom },
        ),
      ).toEqual(expected);
    },
  );

  it("places keyboard-created notes at the current viewport center", () => {
    expect(
      getWorkspaceViewportCenterPosition(
        { width: 800, height: 600 },
        { x: -100, y: 50, zoom: 1 },
      ),
    ).toEqual({ x: 360, y: 140 });
  });

  it("does not create notes from the shortcut while editing or using controls", () => {
    expect(canCreateWorkspaceNoteFromShortcut({ tagName: "TEXTAREA" })).toBe(false);
    expect(canCreateWorkspaceNoteFromShortcut({ tagName: "BUTTON" })).toBe(false);
    expect(canCreateWorkspaceNoteFromShortcut({ isContentEditable: true })).toBe(false);
    expect(canCreateWorkspaceNoteFromShortcut({ tagName: "DIV" })).toBe(true);
  });
});
