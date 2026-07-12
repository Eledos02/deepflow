import { describe, expect, it } from "vitest";

import {
  checkFounderAvailability,
  getStripeBillingConfig,
  isBillingCheckoutEnabled,
  parseCheckoutPlan,
  planFromPriceId,
} from "./billing-plans";

const env = {
  STRIPE_SECRET_KEY: "sk_test_123",
  STRIPE_MONTHLY_PRICE_ID: "price_monthly",
  STRIPE_ANNUAL_PRICE_ID: "price_annual",
  STRIPE_FOUNDER_PRICE_ID: "price_founder",
  FOUNDER_PLAN_ACTIVE: "true",
  FOUNDER_PLAN_MAX_SUBSCRIPTIONS: "10",
  FOUNDER_PLAN_ENDS_AT: "2099-01-01T00:00:00.000Z",
};

describe("Stripe billing plan config", () => {
  it("enables checkout only for a normalized true value", () => {
    expect(isBillingCheckoutEnabled({})).toBe(false);
    expect(isBillingCheckoutEnabled({ BILLING_CHECKOUT_ENABLED: "" })).toBe(false);
    expect(isBillingCheckoutEnabled({ BILLING_CHECKOUT_ENABLED: "false" })).toBe(false);
    expect(isBillingCheckoutEnabled({ BILLING_CHECKOUT_ENABLED: "1" })).toBe(false);
    expect(isBillingCheckoutEnabled({ BILLING_CHECKOUT_ENABLED: "enabled" })).toBe(false);
    expect(isBillingCheckoutEnabled({ BILLING_CHECKOUT_ENABLED: " true " })).toBe(true);
    expect(isBillingCheckoutEnabled({ BILLING_CHECKOUT_ENABLED: "TRUE" })).toBe(true);
  });

  it("accepts only supported checkout plan names", () => {
    expect(parseCheckoutPlan("monthly")).toBe("monthly");
    expect(parseCheckoutPlan("annual")).toBe("annual");
    expect(parseCheckoutPlan("founder")).toBe("founder");
    expect(parseCheckoutPlan("price_founder")).toBeNull();
    expect(parseCheckoutPlan({ plan: "monthly" })).toBeNull();
  });

  it("maps plan names to server-side Stripe price IDs", () => {
    const result = getStripeBillingConfig(env, "https://deepflownow.com");

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error("expected config");

    expect(result.config.plans.monthly.priceId).toBe("price_monthly");
    expect(result.config.plans.annual.priceId).toBe("price_annual");
    expect(result.config.plans.founder.priceId).toBe("price_founder");
    expect(planFromPriceId("price_founder", result.config.plans)).toMatchObject({
      checkoutPlan: "founder",
      planKey: "founding_member",
    });
  });

  it("fails closed when required billing env vars are missing", () => {
    expect(getStripeBillingConfig({}, "https://deepflownow.com")).toEqual({
      ok: false,
      error: "stripe_secret_key_missing",
    });
    expect(getStripeBillingConfig({
      STRIPE_SECRET_KEY: "sk_test_123",
    }, "https://deepflownow.com")).toEqual({
      ok: false,
      error: "stripe_monthly_price_id_missing",
    });
  });

  it("enforces founder active flag, end date, count, and unavailable counts", () => {
    expect(checkFounderAvailability({
      config: { active: false, maxSubscriptions: 10, endsAt: null },
      activeFounderCount: 0,
    })).toEqual({ available: false, reason: "inactive" });

    expect(checkFounderAvailability({
      config: {
        active: true,
        maxSubscriptions: 10,
        endsAt: "2020-01-01T00:00:00.000Z",
      },
      activeFounderCount: 0,
      now: new Date("2026-01-01T00:00:00.000Z"),
    })).toEqual({ available: false, reason: "ended" });

    expect(checkFounderAvailability({
      config: { active: true, maxSubscriptions: 2, endsAt: null },
      activeFounderCount: 2,
    })).toEqual({ available: false, reason: "limit_reached" });

    expect(checkFounderAvailability({
      config: { active: true, maxSubscriptions: 2, endsAt: null },
      activeFounderCount: null,
    })).toEqual({ available: false, reason: "count_unavailable" });

    expect(checkFounderAvailability({
      config: { active: true, maxSubscriptions: 2, endsAt: null },
      activeFounderCount: 1,
    })).toEqual({ available: true });
  });
});
