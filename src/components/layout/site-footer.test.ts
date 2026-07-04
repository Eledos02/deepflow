import { describe, expect, it } from "vitest";

import { footerGroups } from "./site-footer-links";

describe("site footer", () => {
  it("keeps Terms and Privacy discoverable without removing existing groups", () => {
    const links: Array<{ label: string; href: string }> = [];

    for (const group of footerGroups) {
      links.push(...group.links);
    }

    expect(footerGroups.map((group) => group.title)).toEqual([
      "Timers",
      "Learn",
      "Legal",
    ]);
    expect(links).toEqual(
      expect.arrayContaining([
        { label: "Terms", href: "/terms" },
        { label: "Privacy", href: "/privacy" },
        { label: "Pricing", href: "/pricing" },
        { label: "Workspace", href: "/workspace" },
      ]),
    );
  });
});
