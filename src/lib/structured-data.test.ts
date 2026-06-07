import { describe, expect, it } from "vitest";

import { getTimerPath, timers } from "../config/timers";
import { guides } from "../content/guides";
import { pomodoroPage } from "../content/pomodoro-page";
import { getTimerPageContent } from "../content/timer-pages";
import { getTimerToolPath, timerTools } from "../content/timer-tools";
import { absoluteUrl, siteConfig } from "./site";
import {
  createArticleSchema,
  createBreadcrumbSchema,
  createFaqSchema,
  createGlobalStructuredData,
  createHowToSchema,
  createSoftwareApplicationSchema,
  type JsonLdValue,
  validateStructuredData,
} from "./structured-data";

function collectStrings(value: JsonLdValue): string[] {
  if (typeof value === "string") return [value];
  if (value === null || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  return Object.values(value).flatMap(collectStrings);
}

function expectValidStructuredData(data: JsonLdValue) {
  const result = validateStructuredData(
    data as Parameters<typeof validateStructuredData>[0],
  );

  expect(result).toEqual({ valid: true, errors: [] });
  expect(() => JSON.parse(JSON.stringify(data))).not.toThrow();

  const ownedUrls = collectStrings(data).filter(
    (value) => value.startsWith("http") && value.includes("deepflow"),
  );

  expect(ownedUrls.length).toBeGreaterThan(0);
  expect(ownedUrls.every((url) => url.startsWith(siteConfig.url))).toBe(true);
}

describe("global structured data", () => {
  it("defines the required shared entities on the production domain", () => {
    const data = createGlobalStructuredData();
    const graph = data["@graph"];

    expectValidStructuredData(data);
    expect(Array.isArray(graph)).toBe(true);
    expect(
      (graph as Array<Record<string, JsonLdValue>>).map(
        (entity) => entity["@type"],
      ),
    ).toEqual(["Organization", "WebSite", "SoftwareApplication"]);
    expect(siteConfig.url).toBe("https://deepflownow.com");
  });
});

describe("timer structured data", () => {
  it.each(timers)("validates the %i minute timer schemas", (minutes) => {
    const content = getTimerPageContent(minutes);
    const pageUrl = absoluteUrl(getTimerPath(minutes));
    const data = [
      createSoftwareApplicationSchema({
        name: `${content.title} by DeepFlow`,
        description: content.description,
        url: pageUrl,
      }),
      createFaqSchema(content.faqs, pageUrl),
      createHowToSchema({
        name: `How to use a ${minutes} minute timer`,
        description: `A practical method for using DeepFlow's ${minutes} minute countdown effectively.`,
        totalTime: `PT${minutes}M`,
        pageUrl,
        steps: content.howTo,
      }),
      createBreadcrumbSchema({
        pageName: content.title,
        pageUrl,
      }),
    ];

    expectValidStructuredData(data);
    expect(data.map((document) => document["@type"])).toEqual([
      "SoftwareApplication",
      "FAQPage",
      "HowTo",
      "BreadcrumbList",
    ]);
    expect(data[1]["mainEntity"]).toHaveLength(content.faqs.length);
  });

  it.each(timerTools)("validates the $slug tool schemas", (tool) => {
    const pageUrl = absoluteUrl(getTimerToolPath(tool.slug));
    const data = [
      createSoftwareApplicationSchema({
        name: `${tool.shortTitle} Timer by DeepFlow`,
        description: tool.description,
        url: pageUrl,
      }),
      createFaqSchema(tool.faqs, pageUrl),
    ];

    expectValidStructuredData(data);
    expect(data.map((document) => document["@type"])).toEqual([
      "SoftwareApplication",
      "FAQPage",
    ]);
    expect(data[1]["mainEntity"]).toHaveLength(tool.faqs.length);
  });

  it("validates the dedicated Pomodoro page schemas", () => {
    const pageUrl = absoluteUrl("/pomodoro-timer");
    const data = [
      createSoftwareApplicationSchema({
        name: "DeepFlow Pomodoro Timer",
        description: pomodoroPage.description,
        url: pageUrl,
      }),
      createFaqSchema([...pomodoroPage.faqs], pageUrl),
    ];

    expectValidStructuredData(data);
    expect(data.map((document) => document["@type"])).toEqual([
      "SoftwareApplication",
      "FAQPage",
    ]);
    expect(data[1]["mainEntity"]).toHaveLength(pomodoroPage.faqs.length);
  });
});

describe("guide structured data", () => {
  it.each(guides)("validates the $slug article schema", (guide) => {
    const data = createArticleSchema({
      headline: guide.title,
      description: guide.description,
      url: absoluteUrl(`/guides/${guide.slug}`),
    });

    expectValidStructuredData(data);
    expect(data["@type"]).toBe("Article");
  });
});

describe("structured data validation", () => {
  it("rejects invalid contexts and retired DeepFlow domains", () => {
    const result = validateStructuredData({
      "@context": "http://schema.org",
      "@type": "WebSite",
      url: "https://deepflow-beta.vercel.app",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("@context"),
        expect.stringContaining("https://deepflownow.com"),
      ]),
    );
  });
});
