import { describe, expect, it } from "vitest";

import {
  getTimerTool,
  getTimerToolContentWordCount,
  getTimerToolPath,
} from "./timer-tools";

describe("study timer content", () => {
  it("provides 600-800 words of unique study content", () => {
    const tool = getTimerTool("study-timer");
    expect(tool).toBeDefined();

    const wordCount = getTimerToolContentWordCount(tool!);
    expect(wordCount).toBeGreaterThanOrEqual(600);
    expect(wordCount).toBeLessThanOrEqual(800);
  });

  it("uses the requested public route and complete landing sections", () => {
    const tool = getTimerTool("study-timer");
    expect(tool).toBeDefined();

    expect(getTimerToolPath(tool!.slug)).toBe("/tools/study-timer");
    expect(tool!.sections).toHaveLength(3);
    expect(tool!.faqs).toHaveLength(5);
    expect(tool!.seoTitle).toBe(
      "Study Timer - Free Online Timer for Focused Learning",
    );
  });
});
