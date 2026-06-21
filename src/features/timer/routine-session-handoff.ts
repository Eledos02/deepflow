export const ROUTINE_SESSION_HANDOFF_STORAGE_KEY =
  "deepflow:routine-session-handoff:v1";

export type RoutineSessionHandoff = {
  routineId: string;
  routineName: string;
  durationMinutes: number;
  intention: string;
  startedFrom: "/workspace";
};

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

export function parseRoutineSessionHandoff(value: unknown): RoutineSessionHandoff | null {
  if (!value || typeof value !== "object") return null;

  const handoff = value as Partial<RoutineSessionHandoff>;
  if (
    typeof handoff.routineId !== "string" ||
    !handoff.routineId.trim() ||
    typeof handoff.routineName !== "string" ||
    !handoff.routineName.trim() ||
    typeof handoff.durationMinutes !== "number" ||
    !Number.isFinite(handoff.durationMinutes) ||
    handoff.durationMinutes <= 0 ||
    typeof handoff.intention !== "string" ||
    handoff.startedFrom !== "/workspace"
  ) {
    return null;
  }

  return {
    routineId: handoff.routineId.trim().slice(0, 120),
    routineName: handoff.routineName.trim().slice(0, 80),
    durationMinutes: Math.min(720, Math.max(1, Math.round(handoff.durationMinutes))),
    intention: handoff.intention.trim().slice(0, 120),
    startedFrom: "/workspace",
  };
}

export function readRoutineSessionHandoff() {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(ROUTINE_SESSION_HANDOFF_STORAGE_KEY);
    return raw ? parseRoutineSessionHandoff(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeRoutineSessionHandoff(handoff: RoutineSessionHandoff) {
  if (!canUseStorage()) return;

  const normalized = parseRoutineSessionHandoff(handoff);
  if (!normalized) return;

  try {
    window.localStorage.setItem(
      ROUTINE_SESSION_HANDOFF_STORAGE_KEY,
      JSON.stringify(normalized),
    );
  } catch {
    // The timer can still be opened manually if routine handoff storage fails.
  }
}

export function clearRoutineSessionHandoff(routineId?: string) {
  if (!canUseStorage()) return;

  const current = readRoutineSessionHandoff();
  if (routineId && current?.routineId !== routineId) return;

  try {
    window.localStorage.removeItem(ROUTINE_SESSION_HANDOFF_STORAGE_KEY);
  } catch {
    // Clearing handoff state is best-effort after a completed session.
  }
}
