import { describe, expect, it } from "vitest";

import {
  MAX_DISPLAY_NAME_LENGTH,
  getAvatarInitial,
  getWorkspaceGreeting,
  validateDisplayName,
} from "./profile";

describe("profile identity helpers", () => {
  it("validates, trims, and bounds display names for onboarding", () => {
    expect(validateDisplayName("  Luis   Rivera ")).toEqual({
      valid: true,
      value: "Luis Rivera",
    });
    expect(validateDisplayName("   ")).toMatchObject({ valid: false });
    expect(validateDisplayName("a".repeat(MAX_DISPLAY_NAME_LENGTH + 1))).toMatchObject({
      valid: false,
    });
  });

  it("derives a calm avatar initial from a name or email", () => {
    expect(getAvatarInitial("Luis", "luis@example.com")).toBe("L");
    expect(getAvatarInitial(null, "friend@example.com")).toBe("F");
  });

  it("uses local time for a personalized Workspace greeting", () => {
    expect(getWorkspaceGreeting("Luis", new Date(2026, 5, 21, 9))).toBe(
      "Good morning, Luis.",
    );
    expect(getWorkspaceGreeting("Luis", new Date(2026, 5, 21, 14))).toBe(
      "Good afternoon, Luis.",
    );
    expect(getWorkspaceGreeting("Luis", new Date(2026, 5, 21, 20))).toBe(
      "Good evening, Luis.",
    );
  });
});
