import { describe, expect, it } from "vitest";

import {
  legalContactEmail,
  legalLastUpdated,
  privacyPage,
  termsPage,
} from "./legal-pages";

function legalText(sections: typeof termsPage.sections) {
  return sections
    .flatMap((section) => [
      section.title,
      ...(section.paragraphs ?? []),
      ...(section.items ?? []),
    ])
    .join(" ");
}

describe("legal page content", () => {
  it("keeps Terms and Privacy linked to each other", () => {
    expect(termsPage.relatedLink.href).toBe("/privacy");
    expect(privacyPage.relatedLink.href).toBe("/terms");
  });

  it("uses the current public contact email until support is confirmed", () => {
    expect(legalContactEmail).toBe("hello@deepflownow.com");
    expect(legalText(termsPage.sections)).toContain(legalContactEmail);
    expect(legalText(privacyPage.sections)).toContain(legalContactEmail);
  });

  it("documents the billing-ready but pre-checkout product state", () => {
    const termsText = legalText(termsPage.sections);

    expect(termsText).toContain("may offer free and paid plans");
    expect(termsText).toContain("When paid plans are available");
    expect(termsText).toContain("Stripe");
  });

  it("is honest about local-first data and Notes Canvas sync limits", () => {
    const privacyText = legalText(privacyPage.sections);

    expect(privacyText).toContain("localStorage");
    expect(privacyText).toContain("Notes Canvas");
    expect(privacyText).toContain("does not claim that Notes Canvas is synced");
  });

  it("includes a concrete last updated date", () => {
    expect(legalLastUpdated).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
  });
});
