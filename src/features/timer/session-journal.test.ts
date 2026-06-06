import { describe, expect, it } from "vitest";

import {
  calculateFocusJournalSummary,
  getJournalSessionsForPeriod,
  getSessionTaskName,
  groupFocusSessionsByDay,
  inferFocusCategory,
} from "./session-journal";
import type { CompletedTimerSession } from "./timer-storage";

function session(
  id: string,
  completedAtMs: number,
  overrides: Partial<CompletedTimerSession> = {},
): CompletedTimerSession {
  return {
    id,
    completedAtMs,
    durationSeconds: 25 * 60,
    timerKind: "focus",
    countsAsFocus: true,
    ...overrides,
  };
}

describe("focus category inference", () => {
  it("classifies common work intentions", () => {
    expect(inferFocusCategory("Amazon supplier research")).toBe("Research");
    expect(inferFocusCategory("Draft product launch article")).toBe("Writing");
    expect(inferFocusCategory("Debug checkout tests")).toBe("Development");
    expect(inferFocusCategory("Review exam notes")).toBe("Study");
  });

  it("falls back to a useful general category", () => {
    expect(inferFocusCategory("Important customer work")).toBe("General");
  });
});

describe("focus journal history", () => {
  const now = new Date(2026, 5, 5, 12).getTime();
  const sessions = [
    session("today-late", new Date(2026, 5, 5, 11).getTime(), {
      taskName: "Draft launch email",
      category: "Writing",
    }),
    session("today-early", new Date(2026, 5, 5, 9).getTime(), {
      taskName: "Supplier research",
      category: "Research",
    }),
    session("week", new Date(2026, 5, 2, 9).getTime(), {
      taskName: "Market research",
      category: "Research",
      durationSeconds: 50 * 60,
    }),
    session("old", new Date(2026, 4, 30, 9).getTime()),
    session("break", new Date(2026, 5, 5, 10).getTime(), {
      countsAsFocus: false,
      timerKind: "pomodoro",
      durationSeconds: 5 * 60,
    }),
  ];

  it("filters today and the Monday-based current week", () => {
    expect(getJournalSessionsForPeriod(sessions, "today", now)).toHaveLength(2);
    expect(getJournalSessionsForPeriod(sessions, "week", now)).toHaveLength(3);
  });

  it("groups sessions by local completion day in reverse chronology", () => {
    const groups = groupFocusSessionsByDay(
      getJournalSessionsForPeriod(sessions, "week", now),
    );

    expect(groups.map((group) => group.dateKey)).toEqual([
      "2026-06-05",
      "2026-06-02",
    ]);
    expect(groups[0].sessions.map((item) => item.id)).toEqual([
      "today-late",
      "today-early",
    ]);
  });

  it("calculates all-time focus totals and the most common category", () => {
    expect(calculateFocusJournalSummary(sessions)).toEqual({
      totalBlocks: 4,
      totalSeconds: 125 * 60,
      mostCommonCategory: "Research",
    });
  });

  it("reads legacy intentions as journal task names", () => {
    expect(
      getSessionTaskName(
        session("legacy", now, {
          intention: "Legacy planning session",
        }),
      ),
    ).toBe("Legacy planning session");
  });
});
