import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const sourceRoots = [
  join(process.cwd(), "src", "app"),
  join(process.cwd(), "src", "components"),
  join(process.cwd(), "src", "content"),
];

const forbiddenPublicCopy = [
  "Sync with Pro",
  "Upgrade to Pro",
  "Pro sync",
  "Premium features",
  "Become a Founding Member",
  "Founding Members get",
];

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) return collectSourceFiles(path);
    if (/\.(tsx|ts|md)$/.test(path)) return [path];
    return [];
  });
}

describe("pre-Stripe public copy", () => {
  it("does not expose premature Pro or active founder CTA copy", () => {
    const files = sourceRoots.flatMap(collectSourceFiles);
    const matches = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");

      return forbiddenPublicCopy
        .filter((phrase) => source.includes(phrase))
        .map((phrase) => `${file}: ${phrase}`);
    });

    expect(matches).toEqual([]);
  });
});
