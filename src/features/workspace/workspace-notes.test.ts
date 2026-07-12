import { describe, expect, it } from "vitest";

import {
  DEFAULT_WORKSPACE_NOTE_HEIGHT,
  DEFAULT_WORKSPACE_NOTE_WIDTH,
  MAX_WORKSPACE_NOTE_HEIGHT,
  MAX_WORKSPACE_NOTE_WIDTH,
  MAX_FREE_WORKSPACE_NOTES,
  MIN_WORKSPACE_NOTE_HEIGHT,
  MIN_WORKSPACE_NOTE_WIDTH,
  WORKSPACE_NOTES_STORAGE_KEY,
  canCreateWorkspaceNote,
  createWorkspaceNote,
  deleteWorkspaceNote,
  parseWorkspaceNotes,
  resizeWorkspaceNoteDimensions,
  updateWorkspaceNote,
} from "./workspace-notes";

describe("workspace notes", () => {
  it("creates a note using the persisted schema", () => {
    const note = createWorkspaceNote({
      id: "note-1",
      now: "2026-06-18T12:00:00.000Z",
      position: { x: 20.4, y: 40.8 },
      text: "Plan launch",
    });

    expect(note).toEqual({
      id: "note-1",
      title: "",
      text: "Plan launch",
      color: "warm-cream",
      x: 20,
      y: 41,
      width: DEFAULT_WORKSPACE_NOTE_WIDTH,
      height: DEFAULT_WORKSPACE_NOTE_HEIGHT,
      createdAt: "2026-06-18T12:00:00.000Z",
      updatedAt: "2026-06-18T12:00:00.000Z",
    });
  });

  it("creates blank title and body content by default", () => {
    const note = createWorkspaceNote({
      id: "note-1",
      now: "2026-06-18T12:00:00.000Z",
      position: { x: 0, y: 0 },
    });

    expect(note.title).toBe("");
    expect(note.text).toBe("");
  });

  it("migrates legacy notes without a title or color", () => {
    const parsed = parseWorkspaceNotes([
      {
        id: "legacy-note",
        text: "Old local note",
        x: 12,
        y: 18,
        createdAt: "2026-06-18T12:00:00.000Z",
        updatedAt: "2026-06-18T12:00:00.000Z",
      },
    ]);

    expect(parsed[0]).toMatchObject({
      id: "legacy-note",
      title: "Untitled note",
      text: "Old local note",
      color: "warm-cream",
      width: DEFAULT_WORKSPACE_NOTE_WIDTH,
      height: DEFAULT_WORKSPACE_NOTE_HEIGHT,
    });
  });

  it("loads valid persisted note dimensions", () => {
    const note = createWorkspaceNote({
      id: "sized-note",
      now: "2026-06-18T12:00:00.000Z",
      position: { x: 12, y: 18 },
      width: 440,
      height: 360,
    });

    expect(parseWorkspaceNotes([note])[0]).toMatchObject({
      width: 440,
      height: 360,
    });
  });

  it("falls back safely when persisted dimensions are invalid", () => {
    const base = createWorkspaceNote({
      id: "invalid-size",
      now: "2026-06-18T12:00:00.000Z",
      position: { x: 12, y: 18 },
    });
    const parsed = parseWorkspaceNotes([{
      ...base,
      width: -10,
      height: "huge",
    }]);

    expect(parsed[0]).toMatchObject({
      width: DEFAULT_WORKSPACE_NOTE_WIDTH,
      height: DEFAULT_WORKSPACE_NOTE_HEIGHT,
    });
  });

  it("resizes horizontally, vertically, and diagonally", () => {
    expect(resizeWorkspaceNoteDimensions({
      width: 280,
      height: 220,
      deltaX: 40,
      deltaY: 0,
      zoom: 1,
    })).toEqual({ width: 320, height: 220 });
    expect(resizeWorkspaceNoteDimensions({
      width: 280,
      height: 220,
      deltaX: 0,
      deltaY: 50,
      zoom: 1,
    })).toEqual({ width: 280, height: 270 });
    expect(resizeWorkspaceNoteDimensions({
      width: 280,
      height: 220,
      deltaX: 80,
      deltaY: 60,
      zoom: 1,
    })).toEqual({ width: 360, height: 280 });
  });

  it("enforces minimum and maximum dimensions", () => {
    expect(resizeWorkspaceNoteDimensions({
      width: 280,
      height: 220,
      deltaX: -1_000,
      deltaY: -1_000,
      zoom: 1,
    })).toEqual({
      width: MIN_WORKSPACE_NOTE_WIDTH,
      height: MIN_WORKSPACE_NOTE_HEIGHT,
    });
    expect(resizeWorkspaceNoteDimensions({
      width: 280,
      height: 220,
      deltaX: 10_000,
      deltaY: 10_000,
      zoom: 1,
    })).toEqual({
      width: MAX_WORKSPACE_NOTE_WIDTH,
      height: MAX_WORKSPACE_NOTE_HEIGHT,
    });
  });

  it.each([
    [0.75, 80],
    [1, 60],
    [1.25, 48],
    [1.5, 40],
  ])("converts screen resize deltas at %s zoom", (zoom, expectedDelta) => {
    expect(resizeWorkspaceNoteDimensions({
      width: 280,
      height: 220,
      deltaX: 60,
      deltaY: 60,
      zoom,
    })).toEqual({
      width: 280 + expectedDelta,
      height: 220 + expectedDelta,
    });
  });

  it("persists dimensions through the existing local storage schema", () => {
    const note = createWorkspaceNote({
      id: "persisted-size",
      position: { x: 20, y: 40 },
      width: 515,
      height: 405,
    });
    const reloaded = parseWorkspaceNotes(JSON.parse(JSON.stringify([note])));

    expect(WORKSPACE_NOTES_STORAGE_KEY).toBe("deepflow:workspace-notes:v1");
    expect(reloaded[0]).toMatchObject({ width: 515, height: 405 });
  });

  it("preserves intentionally empty note titles", () => {
    const note = createWorkspaceNote({
      id: "note-1",
      now: "2026-06-18T12:00:00.000Z",
      position: { x: 0, y: 0 },
      title: "Custom title",
    });
    const updated = updateWorkspaceNote(
      [note],
      "note-1",
      { title: "" },
      "2026-06-18T13:00:00.000Z",
    );
    const parsed = parseWorkspaceNotes(updated);

    expect(updated[0].title).toBe("");
    expect(parsed[0].title).toBe("");
  });

  it("keeps persisted note colors when they match the palette", () => {
    const parsed = parseWorkspaceNotes([
      {
        id: "colored-note",
        title: "Research",
        text: "Supplier notes",
        color: "mist-green",
        x: 12,
        y: 18,
        createdAt: "2026-06-18T12:00:00.000Z",
        updatedAt: "2026-06-18T12:00:00.000Z",
      },
    ]);

    expect(parsed[0].color).toBe("mist-green");
  });

  it("filters invalid notes and caps imported notes at the free limit", () => {
    const validNotes = Array.from({ length: MAX_FREE_WORKSPACE_NOTES + 2 }, (
      _,
      index,
    ) =>
      createWorkspaceNote({
        id: `note-${index}`,
        now: "2026-06-18T12:00:00.000Z",
        position: { x: index, y: index },
      }),
    );

    expect(parseWorkspaceNotes([...validNotes, { id: "broken" }])).toHaveLength(
      MAX_FREE_WORKSPACE_NOTES,
    );
  });

  it("enforces the free note limit", () => {
    const notes = Array.from({ length: MAX_FREE_WORKSPACE_NOTES }, (_, index) =>
      createWorkspaceNote({
        id: `note-${index}`,
        now: "2026-06-18T12:00:00.000Z",
        position: { x: 0, y: 0 },
      }),
    );

    expect(canCreateWorkspaceNote(notes)).toBe(false);
    expect(canCreateWorkspaceNote(notes.slice(1))).toBe(true);
  });

  it("updates title, text, color, and position without mutating other notes", () => {
    const notes = [
      createWorkspaceNote({
        id: "note-1",
        now: "2026-06-18T12:00:00.000Z",
        position: { x: 0, y: 0 },
      }),
      createWorkspaceNote({
        id: "note-2",
        now: "2026-06-18T12:00:00.000Z",
        position: { x: 10, y: 10 },
      }),
    ];

    const updated = updateWorkspaceNote(
      notes,
      "note-2",
      {
        title: "Launch plan",
        text: "Updated",
        color: "soft-lime",
        x: 42.6,
        y: -10,
      },
      "2026-06-18T13:00:00.000Z",
    );

    expect(updated[0]).toBe(notes[0]);
    expect(updated[1]).toMatchObject({
      title: "Launch plan",
      text: "Updated",
      color: "soft-lime",
      x: 43,
      y: -10,
      updatedAt: "2026-06-18T13:00:00.000Z",
    });
  });

  it("deletes a note by id", () => {
    const notes = [
      createWorkspaceNote({
        id: "note-1",
        position: { x: 0, y: 0 },
      }),
      createWorkspaceNote({
        id: "note-2",
        position: { x: 0, y: 0 },
      }),
    ];

    expect(deleteWorkspaceNote(notes, "note-1")).toHaveLength(1);
    expect(deleteWorkspaceNote(notes, "note-1")[0].id).toBe("note-2");
  });
});
