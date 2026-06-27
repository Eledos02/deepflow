import { afterEach, describe, expect, it, vi } from "vitest";

import type { TimerStats } from "@/features/timer/timer-stats";

import {
  getEffectiveLocalDataMigrationState,
  getLocalDataMigrationStorageKey,
  getLocalDataMigrationSummary,
  saveLocalDataToAccount,
} from "./local-data-migration";
import type { LocalSyncSnapshot } from "./cloud-sync";
import { setLocalDataScopeForUser } from "./local-data-scope";

const userId = "00000000-0000-4000-8000-000000000001";

type UpsertCall = {
  table: string;
  rows: unknown;
};

afterEach(() => {
  setLocalDataScopeForUser(null);
  vi.unstubAllGlobals();
});

function stubLocalStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };

  vi.stubGlobal("window", { localStorage });
  return values;
}

function createSupabaseMock() {
  const upserts: UpsertCall[] = [];

  return {
    upserts,
    supabase: {
      from(table: string) {
        return {
          upsert(rows: unknown) {
            upserts.push({ table, rows });
            return Promise.resolve({ error: null });
          },
        };
      },
    },
  };
}

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

  it("does not upload another account's scoped local data", async () => {
    stubLocalStorage({
      "deepflow:user:account-a:focus_sessions": JSON.stringify([{
        id: "account-a-session",
        completedAtMs: Date.parse("2026-06-20T14:00:00.000Z"),
        durationSeconds: 25 * 60,
        timerKind: "focus",
        countsAsFocus: true,
      }]),
      "deepflow:user:account-a:focus_journal": JSON.stringify([{
        id: "account-a-session",
        title: "Account A work",
        intention: "Account A work",
        durationMinutes: 25,
        timerType: "Focus Timer",
        completedAt: "2026-06-20T14:00:00.000Z",
        sourcePath: "/tools/focus-timer",
      }]),
      "deepflow:user:account-a:focus_routines": JSON.stringify([{
        id: "account-a-routine",
        name: "Account A routine",
        durationMinutes: 25,
        intention: "",
        color: "soft-lime",
        createdAt: "2026-06-20T14:00:00.000Z",
        updatedAt: "2026-06-20T14:00:00.000Z",
      }]),
    });
    const { supabase, upserts } = createSupabaseMock();

    setLocalDataScopeForUser("account-b");
    const result = await saveLocalDataToAccount({
      supabase: supabase as never,
      userId: "account-b",
    });

    expect(result.ok).toBe(true);
    expect(upserts).toEqual([]);
  });

  it("does not create a cloud goal when only default local goal values exist", async () => {
    stubLocalStorage({
      "deepflow:user:account-b:focus_sessions": JSON.stringify([{
        id: "account-b-session",
        completedAtMs: Date.parse("2026-06-20T14:00:00.000Z"),
        durationSeconds: 25 * 60,
        timerKind: "focus",
        countsAsFocus: true,
      }]),
    });
    const { supabase, upserts } = createSupabaseMock();

    setLocalDataScopeForUser("account-b");
    const result = await saveLocalDataToAccount({
      supabase: supabase as never,
      userId: "account-b",
    });

    expect(result.ok).toBe(true);
    expect(upserts.map((call) => call.table)).toEqual(["focus_sessions"]);
    expect(upserts.map((call) => call.table)).not.toContain("focus_goals");
  });

  it("uploads a cloud goal when a real scoped local goal was saved", async () => {
    stubLocalStorage({
      "deepflow:user:account-b:focus_goal": JSON.stringify({
        sessions: 12,
        minutes: 300,
      }),
    });
    const { supabase, upserts } = createSupabaseMock();

    setLocalDataScopeForUser("account-b");
    const result = await saveLocalDataToAccount({
      supabase: supabase as never,
      userId: "account-b",
    });

    expect(result.ok).toBe(true);
    expect(upserts.map((call) => call.table)).toEqual(["focus_goals"]);
    expect(upserts[0].rows).toEqual(expect.objectContaining({
      user_id: "account-b",
      weekly_sessions_target: 12,
      weekly_minutes_target: 300,
    }));
  });
});
