import { describe, expect, it } from "vitest";

import {
  cancelWorkspaceConnectionDrag,
  completeWorkspaceConnectionDrag,
  getWorkspaceConnectionAnchor,
  getWorkspaceConnectionPreviewPath,
  moveWorkspaceConnectionDrag,
  startWorkspaceConnectionDrag,
} from "./workspace-connection-interaction";
import { createWorkspaceNote } from "./workspace-notes";

const source = { noteId: "source", side: "right" } as const;
const target = { noteId: "target", side: "left" } as const;

describe("workspace connection interaction", () => {
  it("starts connection mode from pointer down state", () => {
    expect(startWorkspaceConnectionDrag(7, source, { x: 280, y: 110 })).toEqual({
      pointerId: 7,
      previewEnd: { x: 280, y: 110 },
      source,
      target: null,
    });
  });

  it("updates the live preview during pointer movement", () => {
    const started = startWorkspaceConnectionDrag(7, source, { x: 280, y: 110 });
    const moved = moveWorkspaceConnectionDrag(
      started,
      { x: 460, y: 190 },
      null,
    );

    expect(moved.previewEnd).toEqual({ x: 460, y: 190 });
    expect(moved.target).toBeNull();
  });

  it("completes only when released on a compatible target", () => {
    const started = startWorkspaceConnectionDrag(7, source, { x: 280, y: 110 });
    const hovering = moveWorkspaceConnectionDrag(
      started,
      { x: 500, y: 210 },
      target,
    );

    expect(completeWorkspaceConnectionDrag(hovering)).toEqual({ source, target });
  });

  it("cancels release over empty canvas and rejects the source note", () => {
    const started = startWorkspaceConnectionDrag(7, source, { x: 280, y: 110 });
    const emptyRelease = moveWorkspaceConnectionDrag(
      started,
      { x: 600, y: 400 },
      null,
    );
    const sameNoteRelease = moveWorkspaceConnectionDrag(
      started,
      { x: 0, y: 110 },
      { noteId: "source", side: "left" },
    );

    expect(completeWorkspaceConnectionDrag(emptyRelease)).toBeNull();
    expect(completeWorkspaceConnectionDrag(sameNoteRelease)).toBeNull();
  });

  it("cancels the active drag state for Escape or pointer cancellation", () => {
    expect(cancelWorkspaceConnectionDrag()).toBeNull();
  });

  it("uses moved and resized note dimensions for every anchor", () => {
    const note = createWorkspaceNote({
      id: "resized",
      position: { x: 120, y: 80 },
      width: 460,
      height: 340,
    });

    expect(getWorkspaceConnectionAnchor(note, "top")).toEqual({ x: 350, y: 80 });
    expect(getWorkspaceConnectionAnchor(note, "right")).toEqual({ x: 580, y: 250 });
    expect(getWorkspaceConnectionAnchor(note, "bottom")).toEqual({ x: 350, y: 420 });
    expect(getWorkspaceConnectionAnchor(note, "left")).toEqual({ x: 120, y: 250 });
  });

  it("draws the preview from the selected resized-note anchor", () => {
    const note = createWorkspaceNote({
      id: "resized",
      position: { x: 120, y: 80 },
      width: 460,
      height: 340,
    });

    expect(
      getWorkspaceConnectionPreviewPath(note, "right", { x: 720, y: 300 }),
    ).toMatch(/^M 580 250 Q /);
  });
});
