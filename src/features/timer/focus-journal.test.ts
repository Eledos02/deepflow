import { describe, expect, it } from "vitest";

import {
  FREE_FOCUS_JOURNAL_VISIBLE_LIMIT,
  MAX_FOCUS_JOURNAL_ENTRIES,
  addFocusJournalEntry,
  createFocusJournalEntry,
  getVisibleFocusJournalEntries,
} from "./focus-journal";

function entry(id: string, index = 0) {
  return createFocusJournalEntry({
    id,
    intention: `Strategy ${id}`,
    durationMinutes: 25,
    timerType: "Focus Timer",
    completedAt: new Date(2026, 5, 18, 10, index).toISOString(),
    sourcePath: "/tools/focus-timer",
  });
}

describe("focus journal", () => {
  it("creates a journal entry from a completed session intention", () => {
    expect(entry("session-1")).toEqual({
      id: "session-1",
      title: "Strategy session-1",
      intention: "Strategy session-1",
      durationMinutes: 25,
      timerType: "Focus Timer",
      completedAt: new Date(2026, 5, 18, 10).toISOString(),
      sourcePath: "/tools/focus-timer",
    });
  });

  it("falls back to Focus session when intention is empty", () => {
    const journalEntry = createFocusJournalEntry({
      id: "session-1",
      intention: "   ",
      durationMinutes: 50,
      timerType: "Study Timer",
      completedAt: new Date(2026, 5, 18, 10).toISOString(),
      sourcePath: "/tools/study-timer",
    });

    expect(journalEntry.title).toBe("Focus session");
    expect(journalEntry.intention).toBe("");
  });

  it("preserves optional routine context while keeping legacy fields intact", () => {
    const journalEntry = createFocusJournalEntry({
      id: "routine-session",
      intention: "Draft the outline.",
      durationMinutes: 60,
      timerType: "Deep Work Timer",
      completedAt: new Date(2026, 5, 18, 10).toISOString(),
      sourcePath: "/timer/60",
      routineId: "morning-deep-work",
      routineName: "Morning Deep Work",
    });

    expect(journalEntry).toMatchObject({
      routineId: "morning-deep-work",
      routineName: "Morning Deep Work",
    });
  });

  it("keeps the most recent 100 stored entries", () => {
    const entries = Array.from(
      { length: MAX_FOCUS_JOURNAL_ENTRIES + 5 },
      (_, index) => entry(`session-${index}`, index),
    ).reduce(addFocusJournalEntry, []);

    expect(entries).toHaveLength(MAX_FOCUS_JOURNAL_ENTRIES);
    expect(entries[0].id).toBe("session-104");
    expect(entries.at(-1)?.id).toBe("session-5");
  });

  it("shows the 20 most recent entries for free users", () => {
    const entries = Array.from(
      { length: FREE_FOCUS_JOURNAL_VISIBLE_LIMIT + 5 },
      (_, index) => entry(`session-${index}`, index),
    ).reduce(addFocusJournalEntry, []);

    expect(getVisibleFocusJournalEntries(entries)).toHaveLength(
      FREE_FOCUS_JOURNAL_VISIBLE_LIMIT,
    );
    expect(entries).toHaveLength(FREE_FOCUS_JOURNAL_VISIBLE_LIMIT + 5);
  });

  it("does not duplicate entries with the same id", () => {
    const entries = addFocusJournalEntry(
      addFocusJournalEntry([], entry("session-1")),
      entry("session-1", 10),
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].completedAt).toBe(new Date(2026, 5, 18, 10).toISOString());
  });
});
