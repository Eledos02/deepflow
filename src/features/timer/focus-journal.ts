export const FOCUS_JOURNAL_STORAGE_KEY = "deepflow:focus-journal:v1";
export const FOCUS_JOURNAL_UPDATED_EVENT = "deepflow:focus-journal-updated";
export const MAX_FOCUS_JOURNAL_ENTRIES = 100;
export const FREE_FOCUS_JOURNAL_VISIBLE_LIMIT = 20;

export type FocusJournalEntry = {
  id: string;
  title: string;
  intention: string;
  durationMinutes: number;
  timerType: string;
  completedAt: string;
  sourcePath: string;
};

type FocusJournalInput = {
  id: string;
  intention?: string;
  durationMinutes: number;
  timerType: string;
  completedAt: string;
  sourcePath: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isFocusJournalEntry(value: unknown): value is FocusJournalEntry {
  if (!value || typeof value !== "object") return false;

  const entry = value as Partial<FocusJournalEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.title === "string" &&
    typeof entry.intention === "string" &&
    isPositiveFiniteNumber(entry.durationMinutes) &&
    typeof entry.timerType === "string" &&
    typeof entry.completedAt === "string" &&
    !Number.isNaN(Date.parse(entry.completedAt)) &&
    typeof entry.sourcePath === "string" &&
    entry.sourcePath.startsWith("/")
  );
}

export function createFocusJournalEntry({
  id,
  intention = "",
  durationMinutes,
  timerType,
  completedAt,
  sourcePath,
}: FocusJournalInput): FocusJournalEntry {
  const normalizedIntention = intention.trim().slice(0, 120);

  return {
    id,
    title: normalizedIntention || "Focus session",
    intention: normalizedIntention,
    durationMinutes: Math.max(1, Math.round(durationMinutes)),
    timerType: timerType.trim().slice(0, 80) || "Focus Timer",
    completedAt,
    sourcePath: sourcePath.startsWith("/") ? sourcePath.slice(0, 160) : "/",
  };
}

export function parseFocusJournalEntries(value: unknown): FocusJournalEntry[] {
  if (!Array.isArray(value)) return [];

  const seenIds = new Set<string>();

  return value
    .filter(isFocusJournalEntry)
    .map((entry) =>
      createFocusJournalEntry({
        id: entry.id,
        intention: entry.intention,
        durationMinutes: entry.durationMinutes,
        timerType: entry.timerType,
        completedAt: entry.completedAt,
        sourcePath: entry.sourcePath,
      }),
    )
    .filter((entry) => {
      if (seenIds.has(entry.id)) return false;
      seenIds.add(entry.id);
      return true;
    })
    .sort(
      (a, b) =>
        Date.parse(b.completedAt) - Date.parse(a.completedAt),
    )
    .slice(0, MAX_FOCUS_JOURNAL_ENTRIES);
}

export function addFocusJournalEntry(
  entries: FocusJournalEntry[],
  entry: FocusJournalEntry,
) {
  if (entries.some((existingEntry) => existingEntry.id === entry.id)) {
    return parseFocusJournalEntries(entries);
  }

  return parseFocusJournalEntries([entry, ...entries]);
}

export function getVisibleFocusJournalEntries(entries: FocusJournalEntry[]) {
  return parseFocusJournalEntries(entries).slice(
    0,
    FREE_FOCUS_JOURNAL_VISIBLE_LIMIT,
  );
}

export function readFocusJournalEntries(): FocusJournalEntry[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(FOCUS_JOURNAL_STORAGE_KEY);
    if (!raw) return [];
    return parseFocusJournalEntries(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveFocusJournalEntry(entry: FocusJournalEntry) {
  if (!canUseStorage()) return;

  try {
    const nextEntries = addFocusJournalEntry(readFocusJournalEntries(), entry);
    window.localStorage.setItem(
      FOCUS_JOURNAL_STORAGE_KEY,
      JSON.stringify(nextEntries),
    );
    window.dispatchEvent(new Event(FOCUS_JOURNAL_UPDATED_EVENT));
  } catch {
    // The journal is local-first and should never interrupt timer completion.
  }
}
