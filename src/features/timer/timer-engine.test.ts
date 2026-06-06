import { describe, expect, it } from "vitest";

import { getProgress, getRemainingSeconds } from "./timer-engine";

describe("getRemainingSeconds", () => {
  it("rounds partial seconds up for a human countdown", () => {
    expect(
      getRemainingSeconds({ deadlineMs: 10_500, nowMs: 10_000 }),
    ).toBe(1);
  });

  it("never returns a negative duration", () => {
    expect(
      getRemainingSeconds({ deadlineMs: 10_000, nowMs: 12_000 }),
    ).toBe(0);
  });

  it("derives time from the deadline instead of interval count", () => {
    expect(
      getRemainingSeconds({ deadlineMs: 70_000, nowMs: 11_500 }),
    ).toBe(59);
  });
});

describe("getProgress", () => {
  it("clamps progress to a zero-to-one range", () => {
    expect(getProgress(120, 60)).toBe(0);
    expect(getProgress(30, 60)).toBe(0.5);
    expect(getProgress(-1, 60)).toBe(1);
  });
});
