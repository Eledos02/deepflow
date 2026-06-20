import type { WorkspaceConnection } from "./workspace-connections";
import type { WorkspaceNote, WorkspaceNoteColor } from "./workspace-notes";

export const WORKSPACE_NOTE_WIDTH = 280;
export const WORKSPACE_NOTE_HEIGHT = 220;

export type WorkspacePoint = {
  x: number;
  y: number;
};

export type WorkspaceSelectionRect = {
  start: WorkspacePoint;
  end: WorkspacePoint;
};

export function toggleWorkspaceNoteSelection(
  selectedNoteIds: string[],
  noteId: string,
) {
  return selectedNoteIds.includes(noteId)
    ? selectedNoteIds.filter((id) => id !== noteId)
    : [...selectedNoteIds, noteId];
}

export function normalizeWorkspaceSelectionRect(
  selection: WorkspaceSelectionRect,
) {
  return {
    left: Math.min(selection.start.x, selection.end.x),
    top: Math.min(selection.start.y, selection.end.y),
    right: Math.max(selection.start.x, selection.end.x),
    bottom: Math.max(selection.start.y, selection.end.y),
  };
}

export function selectWorkspaceNotesInRect(
  notes: WorkspaceNote[],
  selection: WorkspaceSelectionRect,
) {
  const rect = normalizeWorkspaceSelectionRect(selection);

  return notes
    .filter(
      (note) =>
        note.x >= rect.left &&
        note.y >= rect.top &&
        note.x + WORKSPACE_NOTE_WIDTH <= rect.right &&
        note.y + WORKSPACE_NOTE_HEIGHT <= rect.bottom,
    )
    .map((note) => note.id);
}

export function moveSelectedWorkspaceNotes(
  notes: WorkspaceNote[],
  selectedNoteIds: string[],
  delta: WorkspacePoint,
  now = new Date().toISOString(),
) {
  const selectedIds = new Set(selectedNoteIds);

  return notes.map((note) =>
    selectedIds.has(note.id)
      ? {
          ...note,
          x: Math.round(note.x + delta.x),
          y: Math.round(note.y + delta.y),
          updatedAt: now,
        }
      : note,
  );
}

export function colorSelectedWorkspaceNotes(
  notes: WorkspaceNote[],
  selectedNoteIds: string[],
  color: WorkspaceNoteColor,
  now = new Date().toISOString(),
) {
  const selectedIds = new Set(selectedNoteIds);

  return notes.map((note) =>
    selectedIds.has(note.id) ? { ...note, color, updatedAt: now } : note,
  );
}

export function deleteSelectedWorkspaceNotes(
  notes: WorkspaceNote[],
  selectedNoteIds: string[],
) {
  const selectedIds = new Set(selectedNoteIds);
  return notes.filter((note) => !selectedIds.has(note.id));
}

export function removeConnectionsForSelectedWorkspaceNotes(
  connections: WorkspaceConnection[],
  selectedNoteIds: string[],
) {
  const selectedIds = new Set(selectedNoteIds);

  return connections.filter(
    (connection) =>
      !selectedIds.has(connection.fromNoteId) &&
      !selectedIds.has(connection.toNoteId),
  );
}
