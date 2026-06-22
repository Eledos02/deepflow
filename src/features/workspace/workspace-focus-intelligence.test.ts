import { describe, expect, it } from "vitest";

import type { WorkspaceAnalytics } from "./workspace-analytics";
import {
  buildWorkspaceFocusIntelligence,
  getFocusPersonality,
  getSessionQuality,
  getWeeklyReflection,
} from "./workspace-focus-intelligence";

function analytics(
  overrides: Partial<WorkspaceAnalytics> = {},
): WorkspaceAnalytics {
  return {
    totalFocusMinutes: 180,
    totalSessions: 4,
    currentStreak: 2,
    bestStreak: 4,
    sessionsToday: 1,
    averageSessionLength: 45,
    averageSessionLengthLastSevenDays: 45,
    longestSessionLength: 60,
    focusMinutesThisWeek: 135,
    sessionsLastSevenDays: 3,
    focusMinutesLastSevenDays: 135,
    activeFocusDaysLastSevenDays: 3,
    weekdayFocusMinutesLastSevenDays: 135,
    weekendFocusMinutesLastSevenDays: 0,
    focusEntryCount: 4,
    recentFocusEntryCount: 3,
    hasEnoughFocusPatternData: true,
    hasEnoughRecentFocusPatternData: true,
    weeklyActivity: [],
    momentum: {
      state: "stable",
      hasBaseline: true,
      percentChange: 0,
      currentMinutes: 135,
      previousMinutes: 135,
    },
    bestFocusDay: "Tuesday",
    bestFocusHour: "9:00 AM",
    bestFocusDayLastSevenDays: "Tuesday",
    bestFocusHourLastSevenDays: "9:00 AM",
    bestFocusHourIndexLastSevenDays: 9,
    ...overrides,
  };
}

describe("workspace focus intelligence", () => {
  it("derives session quality from the current seven-day average session length", () => {
    expect(getSessionQuality(analytics({ averageSessionLengthLastSevenDays: 70 }))?.label)
      .toBe("Deep sessions");
    expect(getSessionQuality(analytics({ averageSessionLengthLastSevenDays: 40 }))?.label)
      .toBe("Steady sessions");
    expect(getSessionQuality(analytics({ averageSessionLengthLastSevenDays: 20 }))?.label)
      .toBe("Quick focus");
    expect(
      getSessionQuality(
        analytics({ averageSessionLength: 90, averageSessionLengthLastSevenDays: 20 }),
      )?.description,
    ).toContain("easiest to repeat");
  });

  it("assigns deterministic focus personalities from seven-day analytics", () => {
    expect(getFocusPersonality(analytics())?.label).toBe("Morning Builder");
    expect(
      getFocusPersonality(
        analytics({ bestFocusHourIndexLastSevenDays: 20 }),
      )?.label,
    ).toBe("Night Creator");
    expect(
      getFocusPersonality(analytics({ activeFocusDaysLastSevenDays: 4 }))?.label,
    ).toBe("Consistent Performer");
    expect(getFocusPersonality(analytics({ averageSessionLengthLastSevenDays: 70 }))?.label)
      .toBe("Deep Worker");
    expect(
      getFocusPersonality(
        analytics({
          weekdayFocusMinutesLastSevenDays: 90,
          weekendFocusMinutesLastSevenDays: 60,
        }),
      )?.label,
    ).toBe("Weekend Explorer");
  });

  it("creates a concise narrative for building momentum and a Morning Builder", () => {
    const reflection = getWeeklyReflection(
      analytics({
        momentum: {
          state: "rising",
          hasBaseline: true,
          percentChange: 25,
          currentMinutes: 135,
          previousMinutes: 108,
        },
      }),
    );

    expect(reflection).toEqual({
      title: "Your rhythm is building.",
      description:
        "Your attention found a steadier rhythm this week. Momentum is beginning to build naturally from repeated focus sessions. Tuesday emerged as your strongest focus day, while your sharpest attention window appeared around 9:00 AM.",
    });
  });

  it("uses a compassionate narrative for slowing momentum and a Deep Worker", () => {
    const reflection = getWeeklyReflection(
      analytics({
        averageSessionLength: 70,
        bestFocusDayLastSevenDays: "Wednesday",
        bestFocusHourLastSevenDays: "10:00 PM",
        bestFocusHourIndexLastSevenDays: 22,
        momentum: {
          state: "slowing",
          hasBaseline: true,
          percentChange: -30,
          currentMinutes: 135,
          previousMinutes: 193,
        },
      }),
    );

    expect(reflection).toMatchObject({
      title: "A gentle reset is enough.",
      description: expect.stringContaining(
        "A small, clear focus block can help momentum gather again",
      ),
    });
    expect(reflection?.description).toContain("Wednesday");
    expect(reflection?.description).toContain("10:00 PM");
  });

  it("uses a sustainable narrative for steady momentum and a Consistent Performer", () => {
    const reflection = getWeeklyReflection(
      analytics({ activeFocusDaysLastSevenDays: 4 }),
    );

    expect(reflection).toMatchObject({
      title: "Steady progress.",
      description: expect.stringContaining("a durable shape"),
    });
    expect(reflection?.description).toContain("Tuesday emerged");
  });

  it("returns a calm empty intelligence snapshot without recent sessions", () => {
    const intelligence = buildWorkspaceFocusIntelligence(
      analytics({
        sessionsLastSevenDays: 0,
        focusMinutesLastSevenDays: 0,
        recentFocusEntryCount: 0,
        hasEnoughRecentFocusPatternData: false,
        bestFocusDayLastSevenDays: null,
        bestFocusHourLastSevenDays: null,
        bestFocusHourIndexLastSevenDays: null,
      }),
    );

    expect(intelligence).toMatchObject({
      hasRecentFocus: false,
      sessionQuality: null,
      personality: null,
      reflection: null,
    });
  });

  it("uses a learning reflection instead of naming an unsupported pattern", () => {
    const intelligence = buildWorkspaceFocusIntelligence(
      analytics({
        sessionsLastSevenDays: 2,
        recentFocusEntryCount: 2,
        hasEnoughRecentFocusPatternData: false,
        bestFocusDayLastSevenDays: null,
        bestFocusHourLastSevenDays: null,
        bestFocusHourIndexLastSevenDays: null,
      }),
    );

    expect(intelligence.reflection).toEqual({
      title: "Your rhythm is starting to take shape.",
      description:
        "Complete a few more sessions and DeepFlow will begin to surface your strongest focus patterns.",
    });
    expect(intelligence.personality).toBeNull();
    expect(intelligence.sessionQuality).toBeNull();
  });
});
