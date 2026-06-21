import {
  DEFAULT_WORKSPACE_NOTE_COLOR,
  WORKSPACE_NOTE_COLORS,
  type WorkspaceNoteColor,
} from "./workspace-notes";

export const WORKSPACE_ROUTINES_STORAGE_KEY = "deepflow:workspace-routines:v1";
export const MAX_FREE_WORKSPACE_ROUTINES = 3;

export const WORKSPACE_ROUTINE_TEMPLATES = [
  {
    id: "morning-deep-work",
    name: "Morning Deep Work",
    durationMinutes: 60,
    intention: "Plan today's highest priority work.",
    color: "soft-lime",
  },
  {
    id: "study-session",
    name: "Study Session",
    durationMinutes: 50,
    intention: "Review notes and practice active recall.",
    color: "mist-green",
  },
  {
    id: "creative-sprint",
    name: "Creative Sprint",
    durationMinutes: 45,
    intention: "Build one clear creative draft.",
    color: "soft-sand",
  },
  {
    id: "planning-block",
    name: "Planning Block",
    durationMinutes: 30,
    intention: "Organize tasks and choose the next step.",
    color: "pale-sage",
  },
  {
    id: "reading-session",
    name: "Reading Session",
    durationMinutes: 25,
    intention: "Read with full attention and capture key ideas.",
    color: "warm-cream",
  },
  {
    id: "coding-session",
    name: "Coding Session",
    durationMinutes: 90,
    intention: "Protect a long block for implementation.",
    color: "mist-green",
  },
] as const satisfies ReadonlyArray<WorkspaceRoutineTemplate>;

export const WORKSPACE_ROUTINE_COLORS = WORKSPACE_NOTE_COLORS;

export type WorkspaceRoutineColor = WorkspaceNoteColor;

export type WorkspaceRoutine = {
  id: string;
  name: string;
  durationMinutes: number;
  intention: string;
  color: WorkspaceRoutineColor;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceRoutineTemplate = {
  id: string;
  name: string;
  durationMinutes: number;
  intention: string;
  color: WorkspaceRoutineColor;
};

export type WorkspaceRoutineDraft = Pick<
  WorkspaceRoutine,
  "name" | "durationMinutes" | "intention" | "color"
>;

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `routine-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isRoutineColor(value: unknown): value is WorkspaceRoutineColor {
  return (
    typeof value === "string" &&
    WORKSPACE_NOTE_COLORS.some((color) => color.id === value)
  );
}

function isPositiveDuration(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  );
}

export function normalizeWorkspaceRoutineDraft(
  draft: Partial<WorkspaceRoutineDraft>,
): WorkspaceRoutineDraft | null {
  const name = typeof draft.name === "string" ? draft.name.trim().slice(0, 80) : "";
  const durationMinutes = Number(draft.durationMinutes);

  if (!name || !isPositiveDuration(durationMinutes)) return null;

  return {
    name,
    durationMinutes: Math.min(720, Math.max(1, Math.round(durationMinutes))),
    intention:
      typeof draft.intention === "string" ? draft.intention.trim().slice(0, 120) : "",
    color: isRoutineColor(draft.color)
      ? draft.color
      : DEFAULT_WORKSPACE_NOTE_COLOR,
  };
}

export function parseWorkspaceRoutines(value: unknown): WorkspaceRoutine[] {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const routine = item as Partial<WorkspaceRoutine>;
      const draft = normalizeWorkspaceRoutineDraft(routine);

      if (
        !draft ||
        typeof routine.id !== "string" ||
        typeof routine.createdAt !== "string" ||
        Number.isNaN(Date.parse(routine.createdAt)) ||
        typeof routine.updatedAt !== "string" ||
        Number.isNaN(Date.parse(routine.updatedAt))
      ) {
        return [];
      }

      return [{
        id: routine.id,
        ...draft,
        createdAt: routine.createdAt,
        updatedAt: routine.updatedAt,
      }];
    })
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, MAX_FREE_WORKSPACE_ROUTINES);
}

export function canCreateWorkspaceRoutine(routines: WorkspaceRoutine[]) {
  return routines.length < MAX_FREE_WORKSPACE_ROUTINES;
}

export function createWorkspaceRoutine({
  id = createId(),
  now = new Date().toISOString(),
  draft,
}: {
  id?: string;
  now?: string;
  draft: WorkspaceRoutineDraft;
}): WorkspaceRoutine | null {
  const normalizedDraft = normalizeWorkspaceRoutineDraft(draft);
  if (!normalizedDraft) return null;

  return {
    id,
    ...normalizedDraft,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateWorkspaceRoutine(
  routines: WorkspaceRoutine[],
  id: string,
  draft: WorkspaceRoutineDraft,
  now = new Date().toISOString(),
) {
  const normalizedDraft = normalizeWorkspaceRoutineDraft(draft);
  if (!normalizedDraft) return routines;

  return routines.map((routine) =>
    routine.id === id
      ? { ...routine, ...normalizedDraft, updatedAt: now }
      : routine,
  );
}

export function deleteWorkspaceRoutine(routines: WorkspaceRoutine[], id: string) {
  return routines.filter((routine) => routine.id !== id);
}

export function readWorkspaceRoutines(): WorkspaceRoutine[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(WORKSPACE_ROUTINES_STORAGE_KEY);
    return raw ? parseWorkspaceRoutines(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function writeWorkspaceRoutines(routines: WorkspaceRoutine[]) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      WORKSPACE_ROUTINES_STORAGE_KEY,
      JSON.stringify(parseWorkspaceRoutines(routines)),
    );
  } catch {
    // Routines are local-first and must never block the workspace UI.
  }
}
