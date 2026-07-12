import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CheckoutHeldButton,
  FounderWaitlistLink,
} from "../../../components/marketing/checkout-launch-hold";

const pricingSource = readFileSync(
  resolve(process.cwd(), "src/app/(marketing)/pricing/page.tsx"),
  "utf8",
);

describe("pricing checkout launch hold", () => {
  it("keeps prices visible while disabling paid purchase CTAs", () => {
    const markup = renderToStaticMarkup(
      <>
        <CheckoutHeldButton />
        <CheckoutHeldButton />
      </>,
    );

    expect(markup.match(/Coming soon/g)).toHaveLength(2);
    expect(markup.match(/aria-disabled="true"/g)).toHaveLength(2);
    expect(markup.match(/disabled=""/g)).toHaveLength(2);
    expect(pricingSource).toContain("$4.99/month");
    expect(pricingSource).toContain("$39/year");
    expect(pricingSource).toContain("$29/year");
    expect(pricingSource).toContain("checkoutEnabled ?");
  });

  it("keeps Free active and routes Founder to the existing waitlist", () => {
    const markup = renderToStaticMarkup(<FounderWaitlistLink />);

    expect(pricingSource).toContain('href="/workspace"');
    expect(pricingSource).toContain("Start focusing");
    expect(markup).toContain('href="#founding-member"');
    expect(markup).toContain("Join Founder waitlist");
    expect(pricingSource).toContain("Paid plans are currently in preview.");
  });
});
