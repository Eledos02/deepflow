import { describe, expect, it } from "vitest";

import { timers } from "../config/timers";
import { guides } from "../content/guides";
import { privacyPage, termsPage } from "../content/legal-pages";
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
    title: "DeepFlow - Calm Focus Workspace for Deep Work",
    description:
      "DeepFlow is a calm focus workspace with focus timers, routines, goals, a private Focus Journal, and quiet insights for deep work.",
    path: "/",
    keywords: [
      "focus workspace",
      "deep work",
      "focus timer",
      "focus journal",
      "calm productivity app",
    ],
  },
  {
    title: "Free Online Focus Timers - DeepFlow",
    description:
      "Choose a calm online timer for focus sessions, study blocks, Pomodoro work, ADHD-friendly focus, breathing breaks, and short tasks.",
    path: "/timers",
    keywords: [
      "online timer",
      "focus timer",
      "study timer",
      "pomodoro timer",
      "ADHD timer",
    ],
  },
  {
    title: "DeepFlow Pricing",
    description:
      "DeepFlow is free to start, with optional Monthly, Annual, and limited Founding Member subscriptions managed through Stripe.",
    path: "/pricing",
    keywords: ["DeepFlow pricing", "Founding Member", "focus workspace"],
  },
  {
    title: termsPage.title,
    description:
      "Read DeepFlow's Terms of Service for accounts, billing readiness, cancellations, refunds, acceptable use, and local-first data behavior.",
    path: "/terms",
    keywords: ["DeepFlow terms", "terms of service", "DeepFlow legal"],
  },
  {
    title: privacyPage.title,
    description:
      "Read DeepFlow's Privacy Policy for account data, local-first browser storage, cloud backup, payments, email, analytics, and cookies.",
    path: "/privacy",
    keywords: ["DeepFlow privacy", "privacy policy", "local-first data"],
  },
  {
    title: "DeepFlow Guides — Focus, Pomodoro, Study & Deep Work",
    description:
      "Explore practical guides on focus, Pomodoro, study timers, deep work, and building better attention habits with DeepFlow.",
    path: "/guides",
    keywords: [
      "focus guides",
      "pomodoro guides",
      "study timer guides",
      "deep work guides",
    ],
  },
  ...timerTools.map((tool) => ({
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
      title: content.seoTitle ?? `${content.title} - Free Online Countdown`,
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

  it("can mark private and auth routes as noindex", () => {
    const metadata = createMetadata({
      title: "Sign in",
      description:
        "Sign in to return to your DeepFlow account and cloud backup for sessions, routines, and goals.",
      path: "/login",
      index: false,
    });

    expect(metadata).toMatchObject({
      alternates: {
        canonical: "https://deepflownow.com/login",
      },
      robots: {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
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
