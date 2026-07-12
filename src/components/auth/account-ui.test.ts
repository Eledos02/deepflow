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
    expect(accountSource).toContain('className="account-profile-section__member"');
    expect(accountSource).toContain('className="account-profile-section__email"');
    expect(accountSource).toContain("Account email");

    const identityRule = rulesContaining(".account-profile-section__identity")
      .find((body) => body.includes("grid-template-columns: minmax(0, 1fr)")) ?? "";
    expect(identityRule).toContain("justify-content: space-between");

    const emailRule = rulesContaining(".account-profile-section__email > strong")
      .find((body) => body.includes("overflow-wrap")) ?? "";
    expect(emailRule).toContain("overflow-wrap: anywhere");

    const profileRule = rulesContaining(".account-profile-section")
      .find((body) => body.includes("border-bottom")) ?? "";
    expect(profileRule).toContain("border-bottom");
    expect(profileRule).not.toContain("border-radius");
    expect(profileRule).not.toContain("background:");
  });

  it("centers cloud status copy and keeps metric rows aligned", () => {
    const statusRule = rulesContaining(".account-cloud-backup-card__status")
      .find((body) => body.includes("justify-content")) ?? "";
    expect(accountSource).toContain('className="account-cloud-backup-card__status"');
    expect(accountSource).toContain('role="status"');
    expect(statusRule).toContain("display: inline-flex");
    expect(statusRule).toContain("align-items: center");
    expect(statusRule).toContain("justify-content: center");
    expect(statusRule).toContain("padding: 9px 12px");
    expect(statusRule).toContain("line-height: 1.2");
    expect(statusRule).toContain("text-align: center");

    const metricRule = rulesContaining(".account-cloud-backup-card__metrics > div")
      .find((body) => body.includes("grid-template-rows")) ?? "";
    expect(metricRule).toContain("display: grid");
    expect(metricRule).toContain("grid-template-rows: 2.6em minmax(1.2em, auto)");
    expect(metricRule).toContain("row-gap: 6px");
  });

  it("uses a restrained solid cloud card surface", () => {
    const cloudRule = rulesContaining(".account-cloud-backup-card")
      .find((body) => body.includes("background: #f8f3e9")) ?? "";
    expect(cloudRule).toContain("border-color: rgba(87, 72, 53, 0.13)");
    expect(cloudRule).toContain("background: #f8f3e9");
    expect(cloudRule).not.toContain("linear-gradient");
  });
});
