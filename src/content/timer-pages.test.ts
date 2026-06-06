import { describe, expect, it } from "vitest";

import { timers } from "../config/timers";

import {
  getTimerContentWordCount,
  getTimerPageContent,
} from "./timer-pages";

function getEditorialBlocks(minutes: (typeof timers)[number]) {
  const content = getTimerPageContent(minutes);

  return [
    ...content.intro,
    ...content.benefits.map((benefit) => benefit.description),
    ...content.howTo.map((step) => step.description),
    ...content.sections.flatMap((section) => section.paragraphs),
    ...content.faqs.map((faq) => faq.answer),
  ];
}

describe("timer page content", () => {
  it.each(timers)(
    "keeps the %i minute landing page between 600 and 1000 words",
    (minutes) => {
      const wordCount = getTimerContentWordCount(
        getTimerPageContent(minutes),
      );

      expect(wordCount).toBeGreaterThanOrEqual(600);
      expect(wordCount).toBeLessThanOrEqual(1000);
    },
  );

  it("does not reuse editorial paragraphs between timer pages", () => {
    const seen = new Map<string, number>();

    for (const minutes of timers) {
      for (const block of getEditorialBlocks(minutes)) {
        const normalized = block.toLowerCase().replace(/\s+/g, " ").trim();
        const previousMinutes = seen.get(normalized);

        expect(
          previousMinutes,
          `"${block}" is shared by ${previousMinutes} and ${minutes} minute pages`,
        ).toBeUndefined();

        seen.set(normalized, minutes);
      }
    }
  });

  it.each(timers)(
    "provides complete landing-page sections for %i minutes",
    (minutes) => {
      const content = getTimerPageContent(minutes);

      expect(content.intro).toHaveLength(2);
      expect(content.benefits).toHaveLength(3);
      expect(content.howTo).toHaveLength(4);
      expect(content.sections.length).toBeGreaterThanOrEqual(2);
      expect(content.faqs.length).toBeGreaterThanOrEqual(5);
      expect(content.internalLinks).toHaveLength(3);
    },
  );
});
