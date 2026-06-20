import { describe, expect, it } from "vitest";

import { createWorkspaceNote } from "./workspace-notes";
import {
  deleteSelectedWorkspaceNotes,
  moveSelectedWorkspaceNotes,
  removeConnectionsForSelectedWorkspaceNotes,
  selectWorkspaceNotesInRect,
  toggleWorkspaceNoteSelection,
} from "./workspace-selection";

const notes = [
  createWorkspaceNote({ id: "note-1", position: { x: 20, y: 20 } }),
  createWorkspaceNote({ id: "note-2", position: { x: 360, y: 80 } }),
  createWorkspaceNote({ id: "note-3", position: { x: 780, y: 80 } }),
];

describe("workspace selection", () => {
  it("adds and removes notes from a shift selection", () => {
    expect(toggleWorkspaceNoteSelection(["note-1"], "note-2")).toEqual([
      "note-1",
      "note-2",
    ]);
    expect(toggleWorkspaceNoteSelection(["note-1", "note-2"], "note-1")).toEqual([
      "note-2",
    ]);
  });

  it("selects notes fully inside a world-coordinate selection box", () => {
    expect(
      selectWorkspaceNotesInRect(notes, {
        start: { x: 0, y: 0 },
        end: { x: 700, y: 350 },
      }),
    ).toEqual(["note-1", "note-2"]);
  });

  it("moves every selected note by the same delta", () => {
    const moved = moveSelectedWorkspaceNotes(
      notes,
      ["note-1", "note-2"],
      { x: 45.4, y: -30.6 },
      "2026-06-19T12:00:00.000Z",
    );

    expect(moved[0]).toMatchObject({ x: 65, y: -11 });
    expect(moved[1]).toMatchObject({ x: 405, y: 49 });
    expect(moved[2]).toBe(notes[2]);
  });

  it("deletes selected notes and their associated connections", () => {
    const connections = [
      {
        id: "connection:note-1:note-2",
        fromNoteId: "note-1",
        toNoteId: "note-2",
        createdAt: "2026-06-19T12:00:00.000Z",
      },
      {
        id: "connection:note-2:note-3",
        fromNoteId: "note-2",
        toNoteId: "note-3",
        createdAt: "2026-06-19T12:00:00.000Z",
      },
    ];

    expect(deleteSelectedWorkspaceNotes(notes, ["note-2"])).toHaveLength(2);
    expect(
      removeConnectionsForSelectedWorkspaceNotes(connections, ["note-2"]),
    ).toEqual([]);
  });
});
