import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const accountSource = readFileSync(
  resolve(process.cwd(), "src/components/auth/auth-pages.tsx"),
  "utf8",
);
const styles = readFileSync(
  resolve(process.cwd(), "src/styles/globals.css"),
  "utf8",
);

function rulesContaining(selector: string) {
  return [...styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => match[1].includes(selector))
    .map((match) => match[2]);
}

describe("account UI structure", () => {
  it("integrates the profile editor without the former nested card", () => {
    expect(accountSource).toContain('className="account-profile-section"');
    expect(accountSource).not.toContain('className="account-profile-card"');

    const profileRule = rulesContaining(".account-profile-section")
      .find((body) => body.includes("border-bottom")) ?? "";
    expect(profileRule).toContain("border-bottom");
    expect(profileRule).not.toContain("border-radius");
    expect(profileRule).not.toContain("background:");
  });

  it("centers cloud status copy and keeps metric rows aligned", () => {
    const statusRule = rulesContaining(".account-cloud-backup-card__heading > span")
      .find((body) => body.includes("justify-content")) ?? "";
    expect(statusRule).toContain("align-items: center");
    expect(statusRule).toContain("justify-content: center");
    expect(statusRule).toContain("text-align: center");

    const metricRule = rulesContaining(".account-cloud-backup-card__metrics div")
      .find((body) => body.includes("grid-template-rows")) ?? "";
    expect(metricRule).toContain("display: grid");
    expect(metricRule).toContain("grid-template-rows:");
  });

  it("uses a restrained solid cloud card surface", () => {
    const cloudRule = rulesContaining(".account-cloud-backup-card")
      .find((body) => body.includes("background: rgba(249, 246, 237")) ?? "";
    expect(cloudRule).toContain("background: rgba(");
    expect(cloudRule).not.toContain("linear-gradient");
  });
});
