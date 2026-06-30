import { describe, expect, it } from "vitest";

import {
  getSafeStripeConfigErrorMessage,
  getStripeServerConfig,
  getStripeWebhookConfig,
} from "./server-config";

describe("Stripe server config", () => {
  it("does not require Stripe env vars until billing code asks for them", () => {
    expect(getStripeServerConfig({})).toEqual({
      ok: false,
      error: "stripe_secret_key_missing",
    });
    expect(getSafeStripeConfigErrorMessage("stripe_secret_key_missing")).toBe(
      "Billing is not active yet.",
    );
  });

  it("loads server-only Stripe values without exposing them through public config", () => {
    const result = getStripeServerConfig({
      STRIPE_SECRET_KEY: "sk_test_secret",
      STRIPE_WEBHOOK_SECRET: "whsec_secret",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_public",
      STRIPE_FOUNDER_PRICE_ID: "price_founder",
      NEXT_PUBLIC_SITE_URL: "https://deepflownow.com/app?ignored=true",
    });

    expect(result).toEqual({
      ok: true,
      config: {
        secretKey: "sk_test_secret",
        webhookSecret: "whsec_secret",
        publishableKey: "pk_test_public",
        founderPriceId: "price_founder",
        siteUrl: "https://deepflownow.com",
      },
    });
  });

  it("loads webhook signing config separately for raw webhook handlers", () => {
    expect(getStripeWebhookConfig({})).toEqual({
      ok: false,
      error: "stripe_webhook_secret_missing",
    });
    expect(getStripeWebhookConfig({ STRIPE_WEBHOOK_SECRET: " whsec_test " }))
      .toEqual({ ok: true, secret: "whsec_test" });
  });
});
