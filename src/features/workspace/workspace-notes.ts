import { FREE_WORKSPACE_LIMITS } from "./workspace-limits";

export const WORKSPACE_NOTES_STORAGE_KEY = "deepflow:workspace-notes:v1";
export const MAX_FREE_WORKSPACE_NOTES = FREE_WORKSPACE_LIMITS.notes;
export const DEFAULT_WORKSPACE_NOTE_TITLE = "Untitled note";
export const DEFAULT_WORKSPACE_NOTE_COLOR = "warm-cream";
export const DEFAULT_WORKSPACE_NOTE_WIDTH = 280;
export const DEFAULT_WORKSPACE_NOTE_HEIGHT = 220;
export const MIN_WORKSPACE_NOTE_WIDTH = 200;
export const MIN_WORKSPACE_NOTE_HEIGHT = 160;
export const MAX_WORKSPACE_NOTE_WIDTH = 720;
export const MAX_WORKSPACE_NOTE_HEIGHT = 640;

export const WORKSPACE_NOTE_COLORS = [
  { id: "warm-cream", label: "Warm Cream" },
  { id: "soft-lime", label: "Soft Lime" },
  { id: "mist-green", label: "Mist Green" },
  { id: "pale-sage", label: "Pale Sage" },
  { id: "soft-sand", label: "Soft Sand" },
] as const;

export type WorkspaceNoteColor = (typeof WORKSPACE_NOTE_COLORS)[number]["id"];

export type WorkspaceNote = {
  id: string;
  title: string;
  text: string;
  color: WorkspaceNoteColor;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
};

type StoredWorkspaceNote = Omit<
  WorkspaceNote,
  "title" | "color" | "width" | "height"
> & {
  title?: string;
  color?: string;
  width?: unknown;
  height?: unknown;
};

type NotePosition = {
  x: number;
  y: number;
};

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeStoredDimension(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
    ? Math.round(value)
    : fallback;
}

function clampDimension(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

export function normalizeWorkspaceNoteDimensions(
  width: unknown,
  height: unknown,
) {
  return {
    width: sanitizeStoredDimension(
      width,
      DEFAULT_WORKSPACE_NOTE_WIDTH,
      MIN_WORKSPACE_NOTE_WIDTH,
      MAX_WORKSPACE_NOTE_WIDTH,
    ),
    height: sanitizeStoredDimension(
      height,
      DEFAULT_WORKSPACE_NOTE_HEIGHT,
      MIN_WORKSPACE_NOTE_HEIGHT,
      MAX_WORKSPACE_NOTE_HEIGHT,
    ),
  };
}

export function resizeWorkspaceNoteDimensions({
  width,
  height,
  deltaX,
  deltaY,
  zoom,
}: {
  width: number;
  height: number;
  deltaX: number;
  deltaY: number;
  zoom: number;
}) {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;

  return {
    width: clampDimension(
      width + deltaX / safeZoom,
      MIN_WORKSPACE_NOTE_WIDTH,
      MAX_WORKSPACE_NOTE_WIDTH,
    ),
    height: clampDimension(
      height + deltaY / safeZoom,
      MIN_WORKSPACE_NOTE_HEIGHT,
      MAX_WORKSPACE_NOTE_HEIGHT,
    ),
  };
}

function isWorkspaceNoteColor(value: unknown): value is WorkspaceNoteColor {
  return (
    typeof value === "string" &&
    WORKSPACE_NOTE_COLORS.some((color) => color.id === value)
  );
}

export function isWorkspaceNote(value: unknown): value is WorkspaceNote {
  if (!value || typeof value !== "object") return false;

  const note = value as Partial<StoredWorkspaceNote>;
  return (
    typeof note.id === "string" &&
    typeof note.text === "string" &&
    isFiniteCoordinate(note.x) &&
    isFiniteCoordinate(note.y) &&
    typeof note.createdAt === "string" &&
    !Number.isNaN(Date.parse(note.createdAt)) &&
    typeof note.updatedAt === "string" &&
    !Number.isNaN(Date.parse(note.updatedAt))
  );
}

export function parseWorkspaceNotes(value: unknown): WorkspaceNote[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isWorkspaceNote)
    .map((note) => ({
      ...note,
      title:
        typeof note.title === "string"
          ? note.title.slice(0, 80)
          : DEFAULT_WORKSPACE_NOTE_TITLE,
      text: note.text.slice(0, 1_000),
      color: isWorkspaceNoteColor(note.color)
        ? note.color
        : DEFAULT_WORKSPACE_NOTE_COLOR,
      x: Math.round(note.x),
      y: Math.round(note.y),
      ...normalizeWorkspaceNoteDimensions(note.width, note.height),
    }))
    .slice(0, MAX_FREE_WORKSPACE_NOTES);
}

export function canCreateWorkspaceNote(notes: WorkspaceNote[]) {
  return notes.length < MAX_FREE_WORKSPACE_NOTES;
}

export function createWorkspaceNote({
  id = createId(),
  now = new Date().toISOString(),
  position,
  title = "",
  text = "",
  color = DEFAULT_WORKSPACE_NOTE_COLOR,
  width = DEFAULT_WORKSPACE_NOTE_WIDTH,
  height = DEFAULT_WORKSPACE_NOTE_HEIGHT,
}: {
  id?: string;
  now?: string;
  position: NotePosition;
  title?: string;
  text?: string;
  color?: WorkspaceNoteColor;
  width?: number;
  height?: number;
}): WorkspaceNote {
  const dimensions = normalizeWorkspaceNoteDimensions(width, height);

  return {
    id,
    title: title.slice(0, 80),
    text,
    color,
    x: Math.round(position.x),
    y: Math.round(position.y),
    ...dimensions,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateWorkspaceNote(
  notes: WorkspaceNote[],
  id: string,
  updates: Partial<
    Pick<WorkspaceNote, "title" | "text" | "color" | "x" | "y" | "width" | "height">
  >,
  now = new Date().toISOString(),
) {
  return notes.map((note) => {
    if (note.id !== id) return note;

    return {
      ...note,
      ...updates,
      title:
        updates.title === undefined
          ? note.title
          : updates.title.slice(0, 80),
      text: updates.text?.slice(0, 1_000) ?? note.text,
      color: updates.color ?? note.color,
      x:
        updates.x === undefined
          ? note.x
          : Math.round(updates.x),
      y:
        updates.y === undefined
          ? note.y
          : Math.round(updates.y),
      width:
        updates.width === undefined
          ? note.width
          : clampDimension(
              updates.width,
              MIN_WORKSPACE_NOTE_WIDTH,
              MAX_WORKSPACE_NOTE_WIDTH,
            ),
      height:
        updates.height === undefined
          ? note.height
          : clampDimension(
              updates.height,
              MIN_WORKSPACE_NOTE_HEIGHT,
              MAX_WORKSPACE_NOTE_HEIGHT,
            ),
      updatedAt: now,
    };
  });
}

export function deleteWorkspaceNote(notes: WorkspaceNote[], id: string) {
  return notes.filter((note) => note.id !== id);
}

export function readWorkspaceNotes(): WorkspaceNote[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(WORKSPACE_NOTES_STORAGE_KEY);
    if (!raw) return [];
    return parseWorkspaceNotes(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeWorkspaceNotes(notes: WorkspaceNote[]) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      WORKSPACE_NOTES_STORAGE_KEY,
      JSON.stringify(parseWorkspaceNotes(notes)),
    );
  } catch {
    // Workspace notes are local-first; storage failures should not break the UI.
  }
}
