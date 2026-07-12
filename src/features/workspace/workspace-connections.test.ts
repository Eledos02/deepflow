import { describe, expect, it } from "vitest";

import {
  MAX_FREE_WORKSPACE_CONNECTIONS,
  WORKSPACE_CONNECTIONS_STORAGE_KEY,
  addWorkspaceConnection,
  canCreateWorkspaceConnection,
  deleteWorkspaceConnection,
  parseWorkspaceConnections,
  removeConnectionsForNote,
} from "./workspace-connections";

describe("workspace connections", () => {
  it("creates an undirected note connection once", () => {
    const first = addWorkspaceConnection(
      [],
      "note-2",
      "note-1",
      "left",
      "right",
      "2026-06-18T12:00:00.000Z",
    );
    const second = addWorkspaceConnection(
      first,
      "note-1",
      "note-2",
      "top",
      "bottom",
      "2026-06-18T13:00:00.000Z",
    );

    expect(second).toHaveLength(1);
    expect(second[0]).toEqual({
      id: "connection:note-1:note-2",
      fromNoteId: "note-2",
      toNoteId: "note-1",
      fromSide: "left",
      toSide: "right",
      createdAt: "2026-06-18T12:00:00.000Z",
    });
  });

  it("ignores self connections and invalid stored entries", () => {
    expect(addWorkspaceConnection([], "note-1", "note-1")).toEqual([]);
    expect(
      parseWorkspaceConnections([
        {
          id: "connection:note-1:note-2",
          fromNoteId: "note-1",
          toNoteId: "note-2",
          fromSide: "diagonal",
          createdAt: "2026-06-18T12:00:00.000Z",
        },
        { id: "broken" },
      ]),
    ).toHaveLength(1);
    expect(
      parseWorkspaceConnections([
        {
          id: "connection:note-1:note-2",
          fromNoteId: "note-1",
          toNoteId: "note-2",
          fromSide: "diagonal",
          createdAt: "2026-06-18T12:00:00.000Z",
        },
      ])[0].fromSide,
    ).toBeUndefined();
  });

  it("keeps legacy stored connections without anchor fields compatible", () => {
    const legacy = {
      id: "connection:legacy-1:legacy-2",
      fromNoteId: "legacy-1",
      toNoteId: "legacy-2",
      createdAt: "2026-06-18T12:00:00.000Z",
    };

    expect(WORKSPACE_CONNECTIONS_STORAGE_KEY).toBe(
      "deepflow:workspace-connections:v1",
    );
    expect(parseWorkspaceConnections([legacy])).toEqual([
      { ...legacy, fromSide: undefined, toSide: undefined },
    ]);
  });

  it("removes connections associated with a deleted note", () => {
    const connections = [
      ...addWorkspaceConnection(
        [],
        "note-1",
        "note-2",
        "right",
        "left",
        "2026-06-18T12:00:00.000Z",
      ),
      ...addWorkspaceConnection(
        [],
        "note-3",
        "note-4",
        "bottom",
        "top",
        "2026-06-18T12:00:00.000Z",
      ),
    ];

    expect(removeConnectionsForNote(connections, "note-2")).toEqual([
      {
        id: "connection:note-3:note-4",
        fromNoteId: "note-3",
        toNoteId: "note-4",
        fromSide: "bottom",
        toSide: "top",
        createdAt: "2026-06-18T12:00:00.000Z",
      },
    ]);
  });

  it("enforces the free connection limit", () => {
    const connections = Array.from(
      { length: MAX_FREE_WORKSPACE_CONNECTIONS },
      (_, index) => ({
        id: `connection:note-${index}:note-${index + 1}`,
        fromNoteId: `note-${index}`,
        toNoteId: `note-${index + 1}`,
        createdAt: "2026-06-18T12:00:00.000Z",
      }),
    );

    expect(canCreateWorkspaceConnection(connections)).toBe(false);
    expect(
      addWorkspaceConnection(connections, "note-100", "note-101"),
    ).toHaveLength(MAX_FREE_WORKSPACE_CONNECTIONS);
    expect(
      parseWorkspaceConnections([
        ...connections,
        {
          id: "connection:extra-1:extra-2",
          fromNoteId: "extra-1",
          toNoteId: "extra-2",
          createdAt: "2026-06-18T12:00:00.000Z",
        },
      ]),
    ).toHaveLength(MAX_FREE_WORKSPACE_CONNECTIONS);
  });

  it("deletes a selected connection by id", () => {
    const connections = addWorkspaceConnection(
      [],
      "note-1",
      "note-2",
      "right",
      "left",
      "2026-06-18T12:00:00.000Z",
    );

    expect(
      deleteWorkspaceConnection(connections, "connection:note-1:note-2"),
    ).toEqual([]);
  });
});
