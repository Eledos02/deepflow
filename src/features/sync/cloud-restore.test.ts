import { afterEach, describe, expect, it, vi } from "vitest";

import type { LocalSyncSnapshot } from "./cloud-sync";
import type {
  CloudFocusGoalRecord,
  CloudFocusRoutineRecord,
  CloudFocusSessionRecord,
} from "./sync-types";
import {
  fetchCloudRestoreSnapshot,
  getCloudRestoreStorageKey,
  getCloudRestoreSummary,
  getEffectiveCloudRestoreState,
  restoreCloudDataToDevice,
  type CloudRestoreSnapshot,
} from "./cloud-restore";
import {
  getScopedLocalDataStorageKey,
  setLocalDataScopeForUser,
} from "./local-data-scope";
import type { TimerStats } from "@/features/timer/timer-stats";

const userId = "00000000-0000-4000-8000-000000000001";

afterEach(() => {
  setLocalDataScopeForUser(null);
  vi.unstubAllGlobals();
});

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

function localSnapshot(partial: Partial<LocalSyncSnapshot> = {}): LocalSyncSnapshot {
  return {
    completedSessions: [],
    journalEntries: [],
    stats: emptyStats(),
    goal: { sessions: 10, minutes: 250 },
    routines: [],
    ...partial,
  };
}

function cloudSession(partial: Partial<CloudFocusSessionRecord> = {}): CloudFocusSessionRecord {
  return {
    user_id: userId,
    local_id: "session-1",
    title: "Strategy draft",
    intention: "Strategy draft",
    category: null,
    duration_minutes: 25,
    completed_at: "2026-06-20T14:00:00.000Z",
    source: "Focus Timer",
    routine_id: null,
    ...partial,
  };
}

function cloudRoutine(partial: Partial<CloudFocusRoutineRecord> = {}): CloudFocusRoutineRecord {
  return {
    user_id: userId,
    local_id: "routine-1",
    name: "Morning Deep Work",
    duration_minutes: 60,
    intention: "Plan the day",
    color: "soft-lime",
    created_at: "2026-06-20T12:00:00.000Z",
    updated_at: "2026-06-20T12:00:00.000Z",
    ...partial,
  };
}

function cloudGoal(): CloudFocusGoalRecord {
  return {
    user_id: userId,
    local_id: "weekly-focus-goal",
    weekly_sessions_target: 12,
    weekly_minutes_target: 300,
  };
}

function cloudSnapshot(partial: Partial<CloudRestoreSnapshot> = {}): CloudRestoreSnapshot {
  return {
    sessions: [cloudSession()],
    goal: cloudGoal(),
    routines: [cloudRoutine()],
    ...partial,
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

describe("cloud restore summary", () => {
  it("detects cloud data on a new device without writing localStorage", () => {
    const values = stubLocalStorage();

    const summary = getCloudRestoreSummary({
      cloudData: cloudSnapshot(),
      localData: localSnapshot(),
      hasStoredGoal: false,
      userId,
    });

    expect(summary).toEqual({
      sessionsAvailable: 1,
      routinesAvailable: 1,
      goalAvailable: true,
      hasData: true,
    });
    expect(values.get(getScopedLocalDataStorageKey("focus_sessions"))).toBeUndefined();
    expect(values.get(getScopedLocalDataStorageKey("focus_journal"))).toBeUndefined();
    expect(values.get(getScopedLocalDataStorageKey("focus_routines"))).toBeUndefined();
    expect(values.get(getScopedLocalDataStorageKey("focus_goal"))).toBeUndefined();
  });

  it("detects cloud records missing from local data", () => {
    expect(
      getCloudRestoreSummary({
        cloudData: cloudSnapshot(),
        localData: localSnapshot(),
        hasStoredGoal: false,
        userId,
      }),
    ).toEqual({
      sessionsAvailable: 1,
      routinesAvailable: 1,
      goalAvailable: true,
      hasData: true,
    });
  });

  it("does not show a cloud goal or goal restore when Supabase has no goal row", () => {
    expect(
      getCloudRestoreSummary({
        cloudData: cloudSnapshot({ goal: null, sessions: [], routines: [] }),
        localData: localSnapshot(),
        hasStoredGoal: false,
        userId,
      }),
    ).toEqual({
      sessionsAvailable: 0,
      routinesAvailable: 0,
      goalAvailable: false,
      hasData: false,
    });
  });

  it("does not offer restore when local data already contains cloud identities", () => {
    expect(
      getCloudRestoreSummary({
        cloudData: cloudSnapshot(),
        localData: localSnapshot({
          journalEntries: [{
            id: "session-1",
            title: "Strategy draft",
            intention: "Strategy draft",
            durationMinutes: 25,
            timerType: "Focus Timer",
            completedAt: "2026-06-20T14:00:00.000Z",
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
      sessionsAvailable: 0,
      routinesAvailable: 0,
      goalAvailable: false,
      hasData: false,
    });
  });

  it("scopes restore state by user id and supports dismissal", () => {
    expect(getCloudRestoreStorageKey("user-a")).toBe(
      "deepflow:cloud-restore:v1:user-a",
    );
    expect(getCloudRestoreStorageKey("user-b")).toBe(
      "deepflow:cloud-restore:v1:user-b",
    );
    expect(
      getEffectiveCloudRestoreState({
        storedState: { status: "dismissed", dismissedAt: "2026-06-20T15:00:00.000Z" },
        summary: {
          sessionsAvailable: 1,
          routinesAvailable: 0,
          goalAvailable: false,
          hasData: true,
        },
      }),
    ).toMatchObject({
      status: "dismissed",
      dismissedAt: "2026-06-20T15:00:00.000Z",
    });
  });
});

describe("fetchCloudRestoreSnapshot", () => {
  it("checks cloud goals read-only and keeps deleted goals deleted", async () => {
    const mutations: string[] = [];
    const supabase = {
      from(table: string) {
        const query = {
          select() {
            return query;
          },
          eq() {
            return query;
          },
          order() {
            return query;
          },
          limit() {
            return Promise.resolve({ data: [], error: null });
          },
          maybeSingle() {
            return Promise.resolve({ data: null, error: null });
          },
          upsert() {
            mutations.push(table);
            return Promise.resolve({ error: null });
          },
          insert() {
            mutations.push(table);
            return Promise.resolve({ error: null });
          },
          update() {
            mutations.push(table);
            return Promise.resolve({ error: null });
          },
        };
        return query;
      },
    };

    const snapshot = await fetchCloudRestoreSnapshot({
      supabase: supabase as never,
      userId,
    });

    expect(snapshot).toEqual({
      ok: true,
      data: {
        sessions: [],
        goal: null,
        routines: [],
      },
    });
    expect(mutations).toEqual([]);
  });
});

describe("restoreCloudDataToDevice", () => {
  it("adds missing cloud sessions, routines, and goal without deleting local data", async () => {
    const values = stubLocalStorage();
    setLocalDataScopeForUser(userId);

    const result = await restoreCloudDataToDevice({
      supabase: {} as never,
      userId,
      cloudData: cloudSnapshot(),
      localData: localSnapshot(),
      hasStoredGoal: false,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected restore success");
    expect(result.restored).toEqual({
      sessions: 1,
      routines: 1,
      goal: 1,
    });
    expect(JSON.parse(values.get(getScopedLocalDataStorageKey("focus_sessions")) ?? "[]")).toHaveLength(1);
    expect(JSON.parse(values.get(getScopedLocalDataStorageKey("focus_journal")) ?? "[]")).toHaveLength(1);
    expect(JSON.parse(values.get(getScopedLocalDataStorageKey("focus_routines")) ?? "[]")).toHaveLength(1);
    expect(JSON.parse(values.get(getScopedLocalDataStorageKey("focus_goal")) ?? "{}")).toEqual({
      sessions: 12,
      minutes: 300,
    });
    expect(values.get("deepflow:completed-sessions:v1")).toBeUndefined();
  });

  it("does not duplicate local records on repeated restore clicks", async () => {
    const values = stubLocalStorage();
    const cloudData = cloudSnapshot();
    setLocalDataScopeForUser(userId);

    await restoreCloudDataToDevice({
      supabase: {} as never,
      userId,
      cloudData,
      localData: localSnapshot(),
      hasStoredGoal: false,
    });
    await restoreCloudDataToDevice({
      supabase: {} as never,
      userId,
      cloudData,
      hasStoredGoal: true,
    });

    expect(JSON.parse(values.get(getScopedLocalDataStorageKey("focus_sessions")) ?? "[]")).toHaveLength(1);
    expect(JSON.parse(values.get(getScopedLocalDataStorageKey("focus_journal")) ?? "[]")).toHaveLength(1);
    expect(JSON.parse(values.get(getScopedLocalDataStorageKey("focus_routines")) ?? "[]")).toHaveLength(1);
  });

  it("does not overwrite an existing local goal", async () => {
    setLocalDataScopeForUser(userId);
    const values = stubLocalStorage({
      [getScopedLocalDataStorageKey("focus_goal")]: JSON.stringify({
        sessions: 5,
        minutes: 100,
      }),
    });

    const result = await restoreCloudDataToDevice({
      supabase: {} as never,
      userId,
      cloudData: cloudSnapshot({ sessions: [], routines: [] }),
      localData: localSnapshot(),
      hasStoredGoal: true,
    });

    expect(result.ok).toBe(true);
    expect(JSON.parse(values.get(getScopedLocalDataStorageKey("focus_goal")) ?? "{}")).toEqual({
      sessions: 5,
      minutes: 100,
    });
  });

  it("restores account B cloud data only into account B scoped keys", async () => {
    const values = stubLocalStorage({
      "deepflow:user:account-a:focus_sessions": JSON.stringify([{ id: "account-a-session" }]),
    });
    setLocalDataScopeForUser("account-b");

    await restoreCloudDataToDevice({
      supabase: {} as never,
      userId: "account-b",
      cloudData: cloudSnapshot({
        sessions: [cloudSession({ user_id: "account-b", local_id: "account-b-session" })],
        goal: null,
        routines: [],
      }),
      localData: localSnapshot(),
      hasStoredGoal: false,
    });

    expect(values.get("deepflow:user:account-a:focus_sessions")).toBe(
      JSON.stringify([{ id: "account-a-session" }]),
    );
    expect(JSON.parse(values.get("deepflow:user:account-b:focus_sessions") ?? "[]")).toEqual([
      expect.objectContaining({ id: "account-b-session" }),
    ]);
    expect(values.get("deepflow:completed-sessions:v1")).toBeUndefined();
  });
});
