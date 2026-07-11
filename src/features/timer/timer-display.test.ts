import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { getTimerDisplayClassName } from "./timer-display";

describe("timer display sizing", () => {
  it.each(["05:00", "25:00", "50:00"])(
    "keeps the normal size for %s",
    (duration) => {
      expect(getTimerDisplayClassName(duration)).toBe("timer-display");
    },
  );

  it.each(["01:00:00", "01:30:00", "02:00:00"])(
    "uses compact typography for %s",
    (duration) => {
      expect(getTimerDisplayClassName(duration)).toBe(
        "timer-display timer-display--compact",
      );
    },
  );

  it("keeps timer digits constrained to one centered line", () => {
    const styles = readFileSync(
      resolve(process.cwd(), "src/styles/globals.css"),
      "utf8",
    );
    const displayRule = styles.match(/\.timer-display\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(displayRule).toContain("max-width: 84%");
    expect(displayRule).toContain("text-align: center");
    expect(displayRule).toContain("white-space: nowrap");
    expect(styles).toMatch(/\.timer-display--compact\s*\{[^}]*font-size:\s*clamp\(/);
  });
});
