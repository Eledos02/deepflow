import { describe, expect, it } from "vitest";

import { shouldCountAsFocusSession } from "./timer-session";

describe("shouldCountAsFocusSession", () => {
  it("counts completed focus and countdown timers as focus minutes", () => {
    expect(shouldCountAsFocusSession("focus", 50 * 60)).toBe(true);
    expect(shouldCountAsFocusSession("countdown", 5 * 60)).toBe(true);
  });

  it("counts only the 25 minute Pomodoro work interval", () => {
    expect(shouldCountAsFocusSession("pomodoro", 25 * 60)).toBe(true);
    expect(shouldCountAsFocusSession("pomodoro", 5 * 60)).toBe(false);
    expect(shouldCountAsFocusSession("pomodoro", 15 * 60)).toBe(false);
  });
});
