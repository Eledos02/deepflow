import { afterEach, describe, expect, it, vi } from "vitest";

import { setLocalDataScopeForUser } from "../sync/local-data-scope";
import {
  MAX_FREE_WORKSPACE_ROUTINES,
  WORKSPACE_ROUTINE_TEMPLATES,
  canCreateWorkspaceRoutine,
  createWorkspaceRoutine,
  deleteWorkspaceRoutine,
  parseWorkspaceRoutines,
  readWorkspaceRoutines,
  updateWorkspaceRoutine,
  writeWorkspaceRoutines,
} from "./workspace-routines";

const now = "2026-06-21T12:00:00.000Z";

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

  vi.stubGlobal("window", {
    dispatchEvent: vi.fn(),
    localStorage,
  });

  return values;
}

function routine(id: string, name = id) {
  const created = createWorkspaceRoutine({
    id,
    now,
    draft: {
      name,
      durationMinutes: 25,
      intention: "Write a clear draft.",
      color: "soft-lime",
    },
  });

  if (!created) throw new Error("Expected a valid routine draft to create");
  return created;
}

describe("workspace routines", () => {
  it("creates a routine using the persisted schema", () => {
    expect(routine("routine-1")).toEqual({
      id: "routine-1",
      name: "routine-1",
      durationMinutes: 25,
      intention: "Write a clear draft.",
      color: "soft-lime",
      createdAt: now,
      updatedAt: now,
    });
  });

  it("updates and deletes routines without touching other records", () => {
    const routines = [routine("routine-1"), routine("routine-2")];
    const updated = updateWorkspaceRoutine(
      routines,
      "routine-2",
      {
        name: "Deep writing",
        durationMinutes: 60,
        intention: "Write the opening section.",
        color: "mist-green",
      },
      "2026-06-21T13:00:00.000Z",
    );

    expect(updated[0]).toBe(routines[0]);
    expect(updated[1]).toMatchObject({
      name: "Deep writing",
      durationMinutes: 60,
      color: "mist-green",
    });
    expect(deleteWorkspaceRoutine(updated, "routine-1")).toHaveLength(1);
  });

  it("enforces the free limit of three routines", () => {
    const routines = Array.from(
      { length: MAX_FREE_WORKSPACE_ROUTINES },
      (_, index) => routine(`routine-${index}`),
    );

    expect(canCreateWorkspaceRoutine(routines)).toBe(false);
    expect(canCreateWorkspaceRoutine(routines.slice(1))).toBe(true);
  });

  it("keeps starter templates unsaved until a routine is created from one", () => {
    const template = WORKSPACE_ROUTINE_TEMPLATES[0];
    const created = createWorkspaceRoutine({
      id: "from-template",
      now,
      draft: template,
    });

    expect(WORKSPACE_ROUTINE_TEMPLATES).toHaveLength(6);
    expect(created).toMatchObject({
      name: "Morning Deep Work",
      durationMinutes: 60,
      intention: "Plan today's highest priority work.",
    });
  });

  it("falls back safely when persisted routines are malformed", () => {
    expect(parseWorkspaceRoutines({ routines: [] })).toEqual([]);
    expect(parseWorkspaceRoutines([{ id: "broken", name: "" }])).toEqual([]);
  });

  it("does not show Account A routines while Account B is active", () => {
    const values = stubLocalStorage();

    setLocalDataScopeForUser("account-a");
    writeWorkspaceRoutines([routine("account-a-routine")]);

    setLocalDataScopeForUser("account-b");
    expect(readWorkspaceRoutines()).toEqual([]);
    writeWorkspaceRoutines([routine("account-b-routine")]);

    expect(readWorkspaceRoutines()).toEqual([
      expect.objectContaining({ id: "account-b-routine" }),
    ]);
    expect(JSON.parse(values.get("deepflow:user:account-a:focus_routines") ?? "[]")).toEqual([
      expect.objectContaining({ id: "account-a-routine" }),
    ]);
    expect(JSON.parse(values.get("deepflow:user:account-b:focus_routines") ?? "[]")).toEqual([
      expect.objectContaining({ id: "account-b-routine" }),
    ]);
  });
});
