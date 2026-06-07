import { describe, expect, it } from "vitest";

import { timers } from "../config/timers";

import {
  getTimerContentWordCount,
  getTimerPageContent,
} from "./timer-pages";

const seoTargetMinutes = [
  15,
  20,
  25,
  30,
  45,
  50,
  60,
  90,
  120,
] as const;

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

  it("keeps target-page SEO fields unique by duration", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    const introductions = new Set<string>();
    const faqQuestions = new Set<string>();
    const faqAnswers = new Set<string>();

    for (const minutes of seoTargetMinutes) {
      const content = getTimerPageContent(minutes);

      expect(titles.has(content.title)).toBe(false);
      expect(descriptions.has(content.description)).toBe(false);
      expect(introductions.has(content.intro.join(" "))).toBe(false);

      titles.add(content.title);
      descriptions.add(content.description);
      introductions.add(content.intro.join(" "));

      for (const faq of content.faqs) {
        expect(faqQuestions.has(faq.question)).toBe(false);
        expect(faqAnswers.has(faq.answer)).toBe(false);
        faqQuestions.add(faq.question);
        faqAnswers.add(faq.answer);
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
