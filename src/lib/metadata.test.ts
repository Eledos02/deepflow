import { describe, expect, it } from "vitest";

import { timers } from "../config/timers";
import { guides } from "../content/guides";
import { pomodoroPage } from "../content/pomodoro-page";
import { getTimerPageContent } from "../content/timer-pages";
import { getTimerToolPath, timerTools } from "../content/timer-tools";
import {
  createMetadata,
  validateMetadataInput,
  type MetadataInput,
} from "./metadata";
import { normalizeSiteUrl } from "./site";

const pageMetadataInputs: MetadataInput[] = [
  {
    title: "Focus better. Finish what matters.",
    description:
      "A calm, accurate focus timer for deep work, Pomodoro sessions, and distraction-free productivity.",
    path: "/",
    keywords: ["focus timer", "deep work", "pomodoro timer", "productivity"],
  },
  {
    title: "Pricing",
    description:
      "Start focusing for free. Upgrade to DeepFlow Pro for history, goals, insights, and distraction blocking.",
    path: "/pricing",
    keywords: ["DeepFlow pricing", "focus app pricing"],
  },
  {
    title: pomodoroPage.title,
    description: pomodoroPage.description,
    path: "/pomodoro-timer",
    keywords: [...pomodoroPage.keywords],
  },
  ...timerTools
    .filter((tool) => tool.slug !== "pomodoro-timer")
    .map((tool) => ({
      title: tool.seoTitle ?? `${tool.shortTitle} Timer - Free Online Timer`,
      description: tool.description,
      path: getTimerToolPath(tool.slug),
      keywords: tool.keywords,
    })),
  ...guides.map((guide) => ({
    title: guide.title,
    description: guide.description,
    path: `/guides/${guide.slug}`,
    keywords: guide.keywords,
  })),
  ...timers.map((minutes) => {
    const content = getTimerPageContent(minutes);

    return {
      title: `${content.title} - Free Online Countdown`,
      description: content.description,
      path: `/timer/${minutes}`,
      keywords: content.keywords,
    };
  }),
];

describe("metadata validation", () => {
  it.each(pageMetadataInputs)(
    "accepts production metadata for $path",
    (input) => {
      expect(validateMetadataInput(input)).toEqual({
        valid: true,
        errors: [],
      });
    },
  );

  it("rejects unsafe canonical paths and weak metadata", () => {
    const result = validateMetadataInput({
      title: "",
      description: "Too short",
      path: "timer/25?preview=true",
      keywords: ["timer", "Timer"],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("title"),
        expect.stringContaining("description"),
        expect.stringContaining("canonical"),
        expect.stringContaining("unique"),
      ]),
    );
  });

  it("emits canonical, index, Open Graph, and Twitter metadata", () => {
    const input = pageMetadataInputs.find(
      (item) => item.path === "/timer/25",
    );
    expect(input).toBeDefined();

    const metadata = createMetadata(input!);

    expect(metadata).toMatchObject({
      alternates: {
        canonical: "https://deepflownow.com/timer/25",
      },
      robots: {
        index: true,
        follow: true,
      },
      openGraph: {
        type: "website",
        url: "https://deepflownow.com/timer/25",
        locale: "en_US",
        title: input!.title,
        description: input!.description,
        images: [
          {
            url: "https://deepflownow.com/deepflow-og.png",
            width: 1200,
            height: 630,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: input!.title,
        description: input!.description,
        images: ["https://deepflownow.com/deepflow-og.png"],
      },
    });
  });
});

describe("site URL validation", () => {
  it("normalizes a valid deployment origin", () => {
    expect(normalizeSiteUrl("https://example.com/anything")).toBe(
      "https://example.com",
    );
  });

  it("rejects unsupported or relative origins", () => {
    expect(() => normalizeSiteUrl("deepflownow.com")).toThrow();
    expect(() => normalizeSiteUrl("ftp://deepflownow.com")).toThrow();
  });
});
