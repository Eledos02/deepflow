import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TimerStats } from "@/features/timer/timer-stats";

import {
  syncDeepFlowData,
  type LocalSyncSnapshot,
} from "./cloud-sync";
import {
  getScopedLocalDataStorageKey,
  setLocalDataScopeForUser,
} from "./local-data-scope";

const userId = "00000000-0000-4000-8000-000000000001";

type UpsertCall = {
  table: string;
  rows: unknown;
  options: unknown;
};

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

function snapshot(): LocalSyncSnapshot {
  return {
    completedSessions: [
      {
        id: "session-1",
        completedAtMs: Date.parse("2026-06-20T14:00:00.000Z"),
        durationSeconds: 25 * 60,
        timerKind: "focus",
        countsAsFocus: true,
        timerType: "Focus Timer",
        path: "/tools/focus-timer",
        taskName: "Write launch notes",
      },
    ],
    journalEntries: [],
    stats: emptyStats(),
    goal: { sessions: 10, minutes: 250 },
    routines: [
      {
        id: "routine-1",
        name: "Morning Deep Work",
        durationMinutes: 60,
        intention: "Plan the day",
        color: "soft-lime",
        createdAt: "2026-06-20T12:00:00.000Z",
        updatedAt: "2026-06-20T12:00:00.000Z",
      },
    ],
  };
}

function emptySnapshot(): LocalSyncSnapshot {
  return {
    completedSessions: [],
    journalEntries: [],
    stats: emptyStats(),
    goal: { sessions: 10, minutes: 250 },
    routines: [],
  };
}

function stubLocalStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };

  vi.stubGlobal("window", {
    dispatchEvent: vi.fn(),
    localStorage,
  });

  return values;
}

function createSupabaseMock({ failTable }: { failTable?: string } = {}) {
  const upserts: UpsertCall[] = [];

  return {
    upserts,
    supabase: {
      from(table: string) {
        return {
          upsert(rows: unknown, options: unknown) {
            upserts.push({ table, rows, options });
            return Promise.resolve({
              error: table === failTable
                ? { code: "TEST", message: "forced failure" }
                : null,
            });
          },
        };
      },
    } as unknown as SupabaseClient,
  };
}

describe("cloud sync service", () => {
  afterEach(() => {
    setLocalDataScopeForUser(null);
    vi.unstubAllGlobals();
  });

  it("upserts completed sessions and routines without creating a default goal", async () => {
    const { supabase, upserts } = createSupabaseMock();

    const result = await syncDeepFlowData({
      supabase,
      userId,
      localData: snapshot(),
      mergeCloudToLocal: false,
    });

    expect(result.ok).toBe(true);
    expect(upserts.map((call) => call.table)).toEqual([
      "focus_sessions",
      "focus_routines",
    ]);
    expect(upserts.map((call) => call.options)).toEqual([
      { onConflict: "user_id,local_id" },
      { onConflict: "user_id,local_id" },
    ]);
    expect(result.summary).toMatchObject({
      focusSessions: 1,
      goals: 0,
      routines: 1,
    });
  });

  it("uploads a real local goal only when goal sync is explicitly enabled", async () => {
    const { supabase, upserts } = createSupabaseMock();

    const result = await syncDeepFlowData({
      supabase,
      userId,
      localData: snapshot(),
      mergeCloudToLocal: false,
      syncGoal: true,
    });

    expect(result.ok).toBe(true);
    expect(upserts.map((call) => call.table)).toEqual([
      "focus_sessions",
      "focus_goals",
      "focus_routines",
    ]);
    expect(result.summary.goals).toBe(1);
  });

  it("does not create duplicate cloud rows for duplicate local focus records", async () => {
    const { supabase, upserts } = createSupabaseMock();
    const localData = snapshot();
    localData.journalEntries = [{
      id: "session-1",
      title: "Journal title",
      intention: "Journal title",
      durationMinutes: 25,
      timerType: "Focus Timer",
      completedAt: "2026-06-20T14:00:00.000Z",
      sourcePath: "/tools/focus-timer",
    }];

    await syncDeepFlowData({
      supabase,
      userId,
      localData,
      mergeCloudToLocal: false,
    });

    const focusRows = upserts.find((call) => call.table === "focus_sessions")
      ?.rows;
    expect(Array.isArray(focusRows)).toBe(true);
    expect(focusRows).toHaveLength(1);
    expect(focusRows).toEqual([
      expect.objectContaining({
        local_id: "session-1",
        title: "Journal title",
      }),
    ]);
  });

  it("treats a manual sync no-op as successful without creating cloud rows", async () => {
    const { supabase, upserts } = createSupabaseMock();

    const result = await syncDeepFlowData({
      supabase,
      userId,
      localData: emptySnapshot(),
      mergeCloudToLocal: false,
      syncGoal: false,
    });

    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({
      focusSessions: 0,
      goals: 0,
      routines: 0,
    });
    expect(upserts).toEqual([]);
  });

  it("returns an error result when Supabase fails without throwing", async () => {
    const { supabase } = createSupabaseMock({ failTable: "focus_sessions" });

    const result = await syncDeepFlowData({
      supabase,
      userId,
      localData: snapshot(),
      mergeCloudToLocal: false,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("error");
    expect(result.summary.goals).toBe(0);
  });

  it("can skip goal upsert for explicit local-data migration when no stored goal exists", async () => {
    const { supabase, upserts } = createSupabaseMock();

    const result = await syncDeepFlowData({
      supabase,
      userId,
      localData: snapshot(),
      mergeCloudToLocal: false,
      syncGoal: false,
    });

    expect(result.ok).toBe(true);
    expect(upserts.map((call) => call.table)).toEqual([
      "focus_sessions",
      "focus_routines",
    ]);
    expect(result.summary.goals).toBe(0);
  });

  it("keeps Notes Canvas local-only by syncing only focus tables", async () => {
    const { supabase, upserts } = createSupabaseMock();

    await syncDeepFlowData({
      supabase,
      userId,
      localData: snapshot(),
      mergeCloudToLocal: false,
    });

    expect(upserts.map((call) => call.table)).toEqual([
      "focus_sessions",
      "focus_routines",
    ]);
    expect(upserts.map((call) => call.table).join(" ")).not.toMatch(/note|canvas/i);
  });

  it("does not auto-restore cloud data during default sync on a new device", async () => {
    const values = stubLocalStorage();
    setLocalDataScopeForUser(userId);
    const supabase = {
      from() {
        return {
          select() {
            throw new Error("Cloud data should not be selected for automatic restore.");
          },
          upsert() {
            return Promise.resolve({ error: null });
          },
        };
      },
    } as unknown as SupabaseClient;

    const result = await syncDeepFlowData({
      supabase,
      userId,
      localData: emptySnapshot(),
      syncGoal: false,
    });

    expect(result.ok).toBe(true);
    expect(values.get(getScopedLocalDataStorageKey("focus_sessions"))).toBeUndefined();
    expect(values.get(getScopedLocalDataStorageKey("focus_journal"))).toBeUndefined();
    expect(values.get(getScopedLocalDataStorageKey("focus_routines"))).toBeUndefined();
    expect(values.get(getScopedLocalDataStorageKey("focus_goal"))).toBeUndefined();
    expect(values.get("deepflow:completed-sessions:v1")).toBeUndefined();
  });
});
