import { describe, expect, it } from "vitest";

import type { TimerStats } from "@/features/timer/timer-stats";

import {
  getEffectiveLocalDataMigrationState,
  getLocalDataMigrationStorageKey,
  getLocalDataMigrationSummary,
} from "./local-data-migration";
import type { LocalSyncSnapshot } from "./cloud-sync";

const userId = "00000000-0000-4000-8000-000000000001";

function emptyStats(): TimerStats {
  return {
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
}

function snapshot(partial: Partial<LocalSyncSnapshot> = {}): LocalSyncSnapshot {
  return {
    completedSessions: [],
    journalEntries: [],
    stats: emptyStats(),
    goal: { sessions: 10, minutes: 250 },
    routines: [],
    ...partial,
  };
}

describe("local data migration", () => {
  it("detects when no meaningful local data is available", () => {
    expect(
      getLocalDataMigrationSummary({
        localData: snapshot(),
        hasStoredGoal: false,
        userId,
      }),
    ).toEqual({
      sessionsFound: 0,
      routinesFound: 0,
      goalFound: false,
      hasData: false,
    });
  });

  it("counts sessions, routines, and explicitly stored goals", () => {
    expect(
      getLocalDataMigrationSummary({
        localData: snapshot({
          journalEntries: [{
            id: "journal-1",
            title: "Strategy draft",
            intention: "Strategy draft",
            durationMinutes: 25,
            timerType: "Focus Timer",
            completedAt: "2026-06-20T15:00:00.000Z",
            sourcePath: "/tools/focus-timer",
          }],
          routines: [{
            id: "routine-1",
            name: "Morning Deep Work",
            durationMinutes: 60,
            intention: "Plan the day",
            color: "soft-lime",
            createdAt: "2026-06-20T12:00:00.000Z",
            updatedAt: "2026-06-20T12:00:00.000Z",
          }],
        }),
        hasStoredGoal: true,
        userId,
      }),
    ).toEqual({
      sessionsFound: 1,
      routinesFound: 1,
      goalFound: true,
      hasData: true,
    });
  });

  it("scopes migration state by user id", () => {
    expect(getLocalDataMigrationStorageKey("user-a")).toBe(
      "deepflow:cloud-migration:v1:user-a",
    );
    expect(getLocalDataMigrationStorageKey("user-b")).toBe(
      "deepflow:cloud-migration:v1:user-b",
    );
  });

  it("shows the migration CTA only when unsaved local data exists", () => {
    expect(
      getEffectiveLocalDataMigrationState({
        storedState: { status: "not_started" },
        summary: {
          sessionsFound: 2,
          routinesFound: 0,
          goalFound: false,
          hasData: true,
        },
      }).status,
    ).toBe("available");

    expect(
      getEffectiveLocalDataMigrationState({
        storedState: { status: "not_started" },
        summary: {
          sessionsFound: 0,
          routinesFound: 0,
          goalFound: false,
          hasData: false,
        },
      }).status,
    ).toBe("not_started");
  });

  it("preserves completed and error states for the current user", () => {
    expect(
      getEffectiveLocalDataMigrationState({
        storedState: {
          status: "completed",
          completedAt: "2026-06-20T15:00:00.000Z",
        },
        summary: {
          sessionsFound: 2,
          routinesFound: 1,
          goalFound: true,
          hasData: true,
        },
      }),
    ).toMatchObject({
      status: "completed",
      completedAt: "2026-06-20T15:00:00.000Z",
      error: null,
    });

    expect(
      getEffectiveLocalDataMigrationState({
        storedState: {
          status: "error",
          error: "forced failure",
        },
      }),
    ).toMatchObject({
      status: "error",
      error: "forced failure",
    });
  });
});
