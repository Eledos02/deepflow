import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const homepage = readFileSync(
  resolve(process.cwd(), "src/app/(marketing)/page.tsx"),
  "utf8",
);

describe("homepage SEO and conversion copy", () => {
  it("keeps one clear H1 and the primary product CTAs above the fold", () => {
    expect(homepage.match(/<h1/g) ?? []).toHaveLength(1);
    expect(homepage).toContain("A calm focus workspace for deep work.");
    expect(homepage).toContain("Start a free focus session");
    expect(homepage).toContain("Create account for cloud backup");
    expect(homepage).toContain("No account required to start");
  });

  it("explains DeepFlow beyond a simple timer", () => {
    expect(homepage).toContain(
      "Not just a timer - a calm system for building a focus practice.",
    );
    expect(homepage).toContain("Completed sessions become your private Focus Journal.");
    expect(homepage).toContain("Built for people doing serious work alone.");
    expect(homepage).toContain("productivity without distraction");
    expect(homepage).toContain("calm productivity app");
  });

  it("preserves useful public internal links and the lower waitlist", () => {
    for (const href of [
      "/tools/focus-timer",
      "/tools/pomodoro-timer",
      "/tools/study-timer",
      "/adhd-timer",
      "/workspace",
      "/pricing",
      "/guides",
    ]) {
      expect(homepage).toContain(`href="${href}"`);
    }

    expect(homepage).toContain('source="homepage_final_cta"');
    expect(homepage).toContain("Founding Member launch updates.");
  });
});
