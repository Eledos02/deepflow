export const WORKSPACE_NOTES_STORAGE_KEY = "deepflow:workspace-notes:v1";
export const MAX_FREE_WORKSPACE_NOTES = 10;
export const DEFAULT_WORKSPACE_NOTE_TITLE = "Untitled note";
export const DEFAULT_WORKSPACE_NOTE_COLOR = "warm-cream";

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
  createdAt: string;
  updatedAt: string;
};

type StoredWorkspaceNote = Omit<WorkspaceNote, "title" | "color"> & {
  title?: string;
  color?: string;
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
        typeof note.title === "string" && note.title.trim()
          ? note.title.slice(0, 80)
          : DEFAULT_WORKSPACE_NOTE_TITLE,
      text: note.text.slice(0, 1_000),
      color: isWorkspaceNoteColor(note.color)
        ? note.color
        : DEFAULT_WORKSPACE_NOTE_COLOR,
      x: Math.max(0, Math.round(note.x)),
      y: Math.max(0, Math.round(note.y)),
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
  title = DEFAULT_WORKSPACE_NOTE_TITLE,
  text = "New note",
  color = DEFAULT_WORKSPACE_NOTE_COLOR,
}: {
  id?: string;
  now?: string;
  position: NotePosition;
  title?: string;
  text?: string;
  color?: WorkspaceNoteColor;
}): WorkspaceNote {
  return {
    id,
    title: title.trim() ? title.slice(0, 80) : DEFAULT_WORKSPACE_NOTE_TITLE,
    text,
    color,
    x: Math.max(0, Math.round(position.x)),
    y: Math.max(0, Math.round(position.y)),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateWorkspaceNote(
  notes: WorkspaceNote[],
  id: string,
  updates: Partial<Pick<WorkspaceNote, "title" | "text" | "color" | "x" | "y">>,
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
          : updates.title.trim()
            ? updates.title.slice(0, 80)
            : DEFAULT_WORKSPACE_NOTE_TITLE,
      text: updates.text?.slice(0, 1_000) ?? note.text,
      color: updates.color ?? note.color,
      x:
        updates.x === undefined
          ? note.x
          : Math.max(0, Math.round(updates.x)),
      y:
        updates.y === undefined
          ? note.y
          : Math.max(0, Math.round(updates.y)),
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
