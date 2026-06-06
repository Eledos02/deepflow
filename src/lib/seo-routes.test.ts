import { describe, expect, it } from "vitest";

import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { getTimerPath, timers } from "../config/timers";
import { getIndexableRoutes } from "./seo-routes";
import { absoluteUrl, siteConfig } from "./site";

describe("indexable route registry", () => {
  it("includes every configured timer route automatically", () => {
    const paths = new Set(getIndexableRoutes().map((route) => route.path));

    for (const minutes of timers) {
      expect(paths.has(getTimerPath(minutes))).toBe(true);
    }
  });

  it("does not emit duplicate or non-canonical paths", () => {
    const paths = getIndexableRoutes().map((route) => route.path);

    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every((path) => path.startsWith("/"))).toBe(true);
    expect(paths.every((path) => !path.includes("?") && !path.includes("#")))
      .toBe(true);
  });
});

describe("SEO route handlers", () => {
  it("generates absolute sitemap entries for the complete registry", () => {
    const entries = sitemap();
    const expectedUrls = getIndexableRoutes().map((route) =>
      absoluteUrl(route.path),
    );

    expect(entries).toHaveLength(expectedUrls.length);
    expect(entries.map((entry) => entry.url)).toEqual(expectedUrls);
  });

  it("allows public crawling and advertises the sitemap", () => {
    expect(robots()).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/app/"],
      },
      sitemap: absoluteUrl("/sitemap.xml"),
      host: siteConfig.url,
    });
  });
});
