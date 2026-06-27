import { describe, expect, it } from "vitest";

import type { FocusJournalEntry } from "@/features/timer/focus-journal";
import type { TimerStats } from "@/features/timer/timer-stats";
import type { CompletedTimerSession } from "@/features/timer/timer-storage";

import {
  WEEKLY_GOAL_LOCAL_ID,
  mapLocalFocusSessionsToCloudRows,
  mapWorkspaceGoalToCloudRow,
  mapWorkspaceRoutinesToCloudRows,
} from "./local-to-cloud-mappers";

const userId = "00000000-0000-4000-8000-000000000001";

const emptyStats: TimerStats = {
  version: 1,
  sessionsToday: 0,
  focusMinutesToday: 0,
  totalSessions: 0,
  totalFocusMinutes: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastCompletedDate: null,
  sessionHistory: [],
};

function completedSession(
  partial: Partial<CompletedTimerSession> = {},
): CompletedTimerSession {
  return {
    id: "session-1",
    completedAtMs: Date.parse("2026-06-20T14:00:00.000Z"),
    durationSeconds: 25 * 60,
    timerKind: "focus",
    countsAsFocus: true,
    timerType: "Focus Timer",
    path: "/tools/focus-timer",
    taskName: "Write launch notes",
    category: "Writing",
    ...partial,
  };
}

function journalEntry(partial: Partial<FocusJournalEntry> = {}): FocusJournalEntry {
  return {
    id: "journal-1",
    title: "Strategy draft",
    intention: "Strategy draft",
    durationMinutes: 25,
    timerType: "Focus Timer",
    completedAt: "2026-06-20T15:00:00.000Z",
    sourcePath: "/tools/focus-timer",
    ...partial,
  };
}

describe("local-to-cloud mappers", () => {
  it("maps completed focus sessions, journal entries, and legacy history into focus session rows", () => {
    const rows = mapLocalFocusSessionsToCloudRows({
      completedSessions: [completedSession({ id: "completed-1" })],
      journalEntries: [journalEntry({ id: "journal-1" })],
      stats: {
        ...emptyStats,
        sessionHistory: [
          {
            completedAt: "2026-06-19T12:00:00.000Z",
            durationMinutes: 15,
            timerType: "Focus Timer",
            path: "/timer/15",
          },
        ],
      },
      userId,
    });

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.user_id)).toEqual([userId, userId, userId]);
    expect(rows.map((row) => row.duration_minutes)).toEqual([15, 25, 25]);
  });

  it("excludes cancelled, break, and zero-duration sessions from focus sync", () => {
    const rows = mapLocalFocusSessionsToCloudRows({
      completedSessions: [
        completedSession({ id: "break", countsAsFocus: false }),
        completedSession({ id: "zero", durationSeconds: 0 }),
      ],
      journalEntries: [],
      stats: {
        ...emptyStats,
        sessionHistory: [
          {
            completedAt: "2026-06-19T12:00:00.000Z",
            durationMinutes: 0,
            timerType: "Timer",
            path: "/timer/5",
          },
        ],
      },
      userId,
    });

    expect(rows).toEqual([]);
  });

  it("deduplicates rows by stable local id and prefers journal copy first", () => {
    const rows = mapLocalFocusSessionsToCloudRows({
      completedSessions: [
        completedSession({
          id: "shared-id",
          taskName: "Local task",
        }),
      ],
      journalEntries: [
        journalEntry({
          id: "shared-id",
          intention: "Journal intention",
          title: "Journal title",
        }),
      ],
      stats: emptyStats,
      userId,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      local_id: "shared-id",
      title: "Journal title",
      intention: "Journal intention",
    });
  });

  it("maps the weekly goal with a stable local id", () => {
    expect(mapWorkspaceGoalToCloudRow({ sessions: 12, minutes: 300 }, userId)).toEqual({
      user_id: userId,
      local_id: WEEKLY_GOAL_LOCAL_ID,
      weekly_sessions_target: 12,
      weekly_minutes_target: 300,
    });
  });

  it("maps routines using their stable local ids", () => {
    const [row] = mapWorkspaceRoutinesToCloudRows([
      {
        id: "routine-1",
        name: "Morning Deep Work",
        durationMinutes: 60,
        intention: "Plan the day",
        color: "soft-lime",
        createdAt: "2026-06-20T12:00:00.000Z",
        updatedAt: "2026-06-20T12:30:00.000Z",
      },
    ], userId);

    expect(row).toMatchObject({
      user_id: userId,
      local_id: "routine-1",
      name: "Morning Deep Work",
      duration_minutes: 60,
      intention: "Plan the day",
      color: "soft-lime",
    });
  });
});
