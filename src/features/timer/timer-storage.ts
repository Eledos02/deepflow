import type { TimerStatus } from "@/features/timer/use-timer";

const TIMER_STATE_PREFIX = "deepflow:timer-state:v1";
const TIMER_PREFERENCES_PREFIX = "deepflow:timer-preferences:v1";
const COMPLETED_SESSIONS_KEY = "deepflow:completed-sessions:v1";
const AUDIO_PREFERENCES_KEY = "deepflow:audio-preferences:v1";
const MAX_COMPLETED_SESSIONS = 2_000;

export const TIMER_ANALYTICS_UPDATED_EVENT = "deepflow:timer-analytics-updated";

export type PersistedTimerState = {
  version: 1;
  totalSeconds: number;
  remainingSeconds: number;
  status: TimerStatus;
  deadlineMs: number | null;
  sessionId: string | null;
  taskName: string | null;
  updatedAtMs: number;
};

export type TimerPreferences = {
  version: 1;
  soundEnabled: boolean;
  intention: string;
};

export type AudioPreferences = {
  version: 1;
  alarmSoundId: "soft-bell" | "zen-gong";
  backgroundSoundId:
    | "rain-window"
    | "fireplace"
    | "ocean-waves"
    | "white-noise"
    | null;
  volume: number;
};

export type CompletedTimerSession = {
  id: string;
  completedAtMs: number;
  completedDate?: string;
  durationSeconds: number;
  timerKind: "focus" | "pomodoro" | "countdown";
  countsAsFocus: boolean;
  timerType?: string;
  path?: string;
  taskName?: string;
  category?: FocusCategory;
  /** Kept for records created before taskName was introduced. */
  intention?: string;
};

export type FocusCategory =
  | "Research"
  | "Writing"
  | "Development"
  | "Study"
  | "Planning"
  | "Design"
  | "Admin"
  | "General";

export type TimerAnalytics = {
  sessionsToday: number;
  sessionsThisWeek: number;
  focusSecondsToday: number;
  currentStreak: number;
};

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isTimerStatus(value: unknown): value is TimerStatus {
  return (
    value === "idle" ||
    value === "running" ||
    value === "paused" ||
    value === "completed"
  );
}

function timerStateKey(storageKey: string) {
  return `${TIMER_STATE_PREFIX}:${storageKey}`;
}

function timerPreferencesKey(storageKey: string) {
  return `${TIMER_PREFERENCES_PREFIX}:${storageKey}`;
}

export function readTimerState(storageKey: string): PersistedTimerState | null {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(timerStateKey(storageKey));
    if (!raw) return null;

    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;

    const state = value as Partial<PersistedTimerState>;
    if (
      state.version !== 1 ||
      !isFiniteNonNegative(state.totalSeconds) ||
      state.totalSeconds === 0 ||
      !isFiniteNonNegative(state.remainingSeconds) ||
      !isTimerStatus(state.status) ||
      !isFiniteNonNegative(state.updatedAtMs) ||
      (state.deadlineMs !== null &&
        state.deadlineMs !== undefined &&
        !isFiniteNonNegative(state.deadlineMs)) ||
      (state.sessionId !== null &&
        state.sessionId !== undefined &&
        typeof state.sessionId !== "string") ||
      (state.taskName !== null &&
        state.taskName !== undefined &&
        typeof state.taskName !== "string")
    ) {
      return null;
    }

    return {
      version: 1,
      totalSeconds: state.totalSeconds,
      remainingSeconds: Math.min(
        state.remainingSeconds,
        state.totalSeconds,
      ),
      status: state.status,
      deadlineMs: state.deadlineMs ?? null,
      sessionId: state.sessionId ?? null,
      taskName: state.taskName?.slice(0, 80) ?? null,
      updatedAtMs: state.updatedAtMs,
    };
  } catch {
    return null;
  }
}

export function writeTimerState(
  storageKey: string,
  state: PersistedTimerState,
) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(timerStateKey(storageKey), JSON.stringify(state));
  } catch {
    // The timer remains functional when storage is unavailable or full.
  }
}

export function readTimerPreferences(
  storageKey: string,
): TimerPreferences | null {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(timerPreferencesKey(storageKey));
    if (!raw) return null;

    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;

    const preferences = value as Partial<TimerPreferences>;
    if (
      preferences.version !== 1 ||
      typeof preferences.soundEnabled !== "boolean" ||
      typeof preferences.intention !== "string"
    ) {
      return null;
    }

    return {
      version: 1,
      soundEnabled: preferences.soundEnabled,
      intention: preferences.intention.slice(0, 80),
    };
  } catch {
    return null;
  }
}

export function writeTimerPreferences(
  storageKey: string,
  preferences: TimerPreferences,
) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      timerPreferencesKey(storageKey),
      JSON.stringify(preferences),
    );
  } catch {
    // Preferences are non-critical and should never block the timer.
  }
}

export function readAudioPreferences(): AudioPreferences | null {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(AUDIO_PREFERENCES_KEY);
    if (!raw) return null;

    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;

    const preferences = value as Partial<AudioPreferences>;
    const validAlarm =
      preferences.alarmSoundId === "soft-bell" ||
      preferences.alarmSoundId === "zen-gong";
    const validBackground =
      preferences.backgroundSoundId === null ||
      preferences.backgroundSoundId === "rain-window" ||
      preferences.backgroundSoundId === "fireplace" ||
      preferences.backgroundSoundId === "ocean-waves" ||
      preferences.backgroundSoundId === "white-noise";

    if (
      preferences.version !== 1 ||
      !validAlarm ||
      !validBackground ||
      typeof preferences.volume !== "number" ||
      !Number.isFinite(preferences.volume)
    ) {
      return null;
    }

    return {
      version: 1,
      alarmSoundId:
        preferences.alarmSoundId === "zen-gong"
          ? "zen-gong"
          : "soft-bell",
      backgroundSoundId: preferences.backgroundSoundId ?? null,
      volume: Math.min(1, Math.max(0, preferences.volume)),
    };
  } catch {
    return null;
  }
}

export function writeAudioPreferences(preferences: AudioPreferences) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      AUDIO_PREFERENCES_KEY,
      JSON.stringify(preferences),
    );
  } catch {
    // Audio preferences are optional and must never interrupt a timer.
  }
}

function isCompletedTimerSession(
  value: unknown,
): value is CompletedTimerSession {
  if (!value || typeof value !== "object") return false;

  const session = value as Partial<CompletedTimerSession>;
  return (
    typeof session.id === "string" &&
    isFiniteNonNegative(session.completedAtMs) &&
    isFiniteNonNegative(session.durationSeconds) &&
    session.durationSeconds > 0 &&
    (session.timerKind === "focus" ||
      session.timerKind === "pomodoro" ||
      session.timerKind === "countdown") &&
    typeof session.countsAsFocus === "boolean" &&
    (session.completedDate === undefined ||
      typeof session.completedDate === "string") &&
    (session.taskName === undefined || typeof session.taskName === "string") &&
    (session.timerType === undefined || typeof session.timerType === "string") &&
    (session.path === undefined || typeof session.path === "string") &&
    (session.category === undefined || isFocusCategory(session.category)) &&
    (session.intention === undefined || typeof session.intention === "string")
  );
}

function isFocusCategory(value: unknown): value is FocusCategory {
  return (
    value === "Research" ||
    value === "Writing" ||
    value === "Development" ||
    value === "Study" ||
    value === "Planning" ||
    value === "Design" ||
    value === "Admin" ||
    value === "General"
  );
}

export function readCompletedSessions(): CompletedTimerSession[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(COMPLETED_SESSIONS_KEY);
    if (!raw) return [];

    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];

    return value.filter(isCompletedTimerSession).map((session) => ({
      ...session,
      completedDate:
        session.completedDate ?? localDateKey(session.completedAtMs),
      taskName:
        session.taskName?.slice(0, 80) ??
        session.intention?.slice(0, 80),
    }));
  } catch {
    return [];
  }
}

export function saveCompletedSession(session: CompletedTimerSession) {
  if (!canUseStorage()) return;

  const sessions = readCompletedSessions();
  if (sessions.some((existing) => existing.id === session.id)) return;

  const normalizedSession: CompletedTimerSession = {
    ...session,
    completedDate:
      session.completedDate ?? localDateKey(session.completedAtMs),
    taskName:
      session.taskName?.trim().slice(0, 80) ||
      session.intention?.trim().slice(0, 80) ||
      undefined,
  };
  const nextSessions = [...sessions, normalizedSession]
    .sort((a, b) => a.completedAtMs - b.completedAtMs)
    .slice(-MAX_COMPLETED_SESSIONS);

  try {
    window.localStorage.setItem(
      COMPLETED_SESSIONS_KEY,
      JSON.stringify(nextSessions),
    );
    window.dispatchEvent(new Event(TIMER_ANALYTICS_UPDATED_EVENT));
  } catch {
    // Analytics are best-effort and must not interrupt completion handling.
  }
}

function localDateKey(timestampMs: number) {
  const date = new Date(timestampMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(timestampMs: number) {
  const date = new Date(timestampMs);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function startOfLocalWeek(timestampMs: number) {
  const date = new Date(timestampMs);
  const day = date.getDay();
  const daysSinceMonday = (day + 6) % 7;
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - daysSinceMonday,
  ).getTime();
}

function getCurrentStreak(
  focusSessions: CompletedTimerSession[],
  nowMs: number,
) {
  if (focusSessions.length === 0) return 0;

  const activeDays = new Set(
    focusSessions.map((session) => localDateKey(session.completedAtMs)),
  );
  const cursor = new Date(startOfLocalDay(nowMs));
  const todayKey = localDateKey(cursor.getTime());

  if (!activeDays.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!activeDays.has(localDateKey(cursor.getTime()))) return 0;
  }

  let streak = 0;
  while (activeDays.has(localDateKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function calculateTimerAnalytics(
  sessions: CompletedTimerSession[],
  nowMs = Date.now(),
): TimerAnalytics {
  const todayStart = startOfLocalDay(nowMs);
  const weekStart = startOfLocalWeek(nowMs);
  const sessionsToday = sessions.filter(
    (session) => session.completedAtMs >= todayStart,
  );
  const focusSessions = sessions.filter((session) => session.countsAsFocus);

  return {
    sessionsToday: sessionsToday.length,
    sessionsThisWeek: sessions.filter(
      (session) => session.completedAtMs >= weekStart,
    ).length,
    focusSecondsToday: sessionsToday
      .filter((session) => session.countsAsFocus)
      .reduce((total, session) => total + session.durationSeconds, 0),
    currentStreak: getCurrentStreak(focusSessions, nowMs),
  };
}
