import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { guides } from "../content/guides";
import { getTimerPageContent } from "../content/timer-pages";
import { getTimerTool, getTimerToolPath } from "../content/timer-tools";
import { getIndexableRoutes } from "./seo-routes";

describe("V7.6.1 timer SEO lift", () => {
  it("strengthens the focus timer metadata, H1, copy, and internal links", () => {
    const focusTimer = getTimerTool("focus-timer");

    expect(focusTimer).toMatchObject({
      seoTitle: "Focus Timer - Free Online Timer for Deep Work",
      title: "Free focus timer for deep work",
      description:
        "Use DeepFlow's free focus timer to start one task, protect a deep work session, and save what you finished in a private Focus Journal.",
    });
    expect(focusTimer?.keywords).toEqual(
      expect.arrayContaining([
        "focus timer",
        "online focus timer",
        "free focus timer",
        "deep work timer",
        "focus session timer",
      ]),
    );
    expect(focusTimer?.sections?.map((section) => section.title)).toEqual(
      expect.arrayContaining([
        "What is a focus timer?",
        "How to use this focus timer",
        "Best session lengths for focused work",
        "Focus timer vs Pomodoro timer",
        "Why DeepFlow is more than a timer",
      ]),
    );
    expect(focusTimer?.internalLinks?.map((link) => link.href)).toEqual(
      expect.arrayContaining([
        "/workspace",
        "/tools/pomodoro-timer",
        "/tools/study-timer",
        "/tools/countdown-timer",
        "/adhd-timer",
        "/guides/focus-better",
        "/guides/deep-work",
      ]),
    );
  });

  it("makes the Pomodoro tool route canonical while keeping the shortcut redirect", () => {
    expect(getTimerToolPath("pomodoro-timer")).toBe("/tools/pomodoro-timer");
    expect(getIndexableRoutes().map((route) => route.path)).toEqual(
      expect.arrayContaining(["/tools/pomodoro-timer"]),
    );
    expect(getIndexableRoutes().map((route) => route.path)).not.toContain(
      "/pomodoro-timer",
    );

    const shortcutPage = readFileSync(
      resolve(process.cwd(), "src/app/(marketing)/pomodoro-timer/page.tsx"),
      "utf8",
    );

    expect(shortcutPage).toContain('permanentRedirect("/tools/pomodoro-timer")');
  });

  it("strengthens Pomodoro timer metadata and educational copy", () => {
    const pomodoro = getTimerTool("pomodoro-timer");

    expect(pomodoro).toMatchObject({
      seoTitle: "Pomodoro Timer - Free Online Pomodoro for Focus",
      title: "Free Pomodoro timer for focused work",
      description:
        "Start a calm Pomodoro timer for focused work, studying, or writing. Use DeepFlow to protect one task and build a repeatable focus rhythm.",
    });
    expect(pomodoro?.keywords).toEqual(
      expect.arrayContaining([
        "pomodoro timer",
        "pomodoro timer online",
        "pomodoro technique timer",
        "free pomodoro timer",
        "online pomodoro",
      ]),
    );
    expect(pomodoro?.sections?.map((section) => section.title)).toEqual(
      expect.arrayContaining([
        "What is the Pomodoro technique?",
        "How a Pomodoro session works",
        "Pomodoro timer vs flexible focus timer",
        "How DeepFlow supports focus beyond one Pomodoro",
      ]),
    );
  });

  it("makes the 60 minute page duration-specific for deep work", () => {
    const content = getTimerPageContent(60);

    expect(content.title).toBe("60 minute timer for deep work");
    expect(content.seoTitle).toBe("60 Minute Timer for Deep Work");
    expect(content.description).toBe(
      "Start a 60-minute focus session for deep work, studying, writing, or coding with DeepFlow's calm online timer.",
    );
    expect(content.keywords).toEqual(
      expect.arrayContaining([
        "60 minute timer",
        "60 minute focus timer",
        "deep work timer",
      ]),
    );
    expect(content.sections.map((section) => section.title)).toContain(
      "What can you do in a 60 minute focus session?",
    );
  });

  it("keeps guides indexable and linked to focus tools", () => {
    const indexablePaths = getIndexableRoutes().map((route) => route.path);

    expect(indexablePaths).toEqual(expect.arrayContaining(["/guides"]));
    for (const guide of guides) {
      expect(indexablePaths).toContain(`/guides/${guide.slug}`);
      expect(guide.title).toBeTruthy();
      expect(guide.description.length).toBeGreaterThan(50);
    }

    expect(indexablePaths).not.toEqual(
      expect.arrayContaining([
        "/workspace",
        "/account",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
      ]),
    );
  });
});
