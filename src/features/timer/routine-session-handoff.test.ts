import { describe, expect, it } from "vitest";

import { parseRoutineSessionHandoff } from "./routine-session-handoff";

describe("routine session handoff", () => {
  it("normalizes a valid routine handoff payload", () => {
    expect(
      parseRoutineSessionHandoff({
        routineId: "morning-deep-work",
        routineName: "Morning Deep Work",
        durationMinutes: 60.4,
        intention: "Plan the launch.",
        startedFrom: "/workspace",
      }),
    ).toEqual({
      routineId: "morning-deep-work",
      routineName: "Morning Deep Work",
      durationMinutes: 60,
      intention: "Plan the launch.",
      startedFrom: "/workspace",
    });
  });

  it("rejects invalid handoff payloads", () => {
    expect(parseRoutineSessionHandoff({ durationMinutes: 25 })).toBeNull();
    expect(
      parseRoutineSessionHandoff({
        routineId: "routine",
        routineName: "Routine",
        durationMinutes: 0,
        intention: "",
        startedFrom: "/workspace",
      }),
    ).toBeNull();
  });
});
