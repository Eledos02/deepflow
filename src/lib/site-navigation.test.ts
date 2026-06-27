import { describe, expect, it } from "vitest";

import { siteConfig } from "./site";

describe("site navigation", () => {
  it("keeps every public timer route discoverable in the Timers menu", () => {
    expect(siteConfig.timerNavigation).toEqual([
      { label: "All Timers", href: "/timers" },
      { label: "Focus Timer", href: "/tools/focus-timer" },
      { label: "Countdown Timer", href: "/tools/countdown-timer" },
      { label: "Study Timer", href: "/tools/study-timer" },
      { label: "Pomodoro Timer", href: "/pomodoro-timer" },
      { label: "ADHD Timer", href: "/adhd-timer" },
    ]);
  });

  it("keeps the primary product, workspace, guide, and pricing links available", () => {
    expect(siteConfig.navigation.map((item) => item.href)).toEqual([
      "/#product",
      "/workspace",
      "/guides",
      "/pricing",
    ]);
  });
});
