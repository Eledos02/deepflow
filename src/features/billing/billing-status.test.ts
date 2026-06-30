import { describe, expect, it } from "vitest";

import {
  canUseFounderFeatures,
  deriveAccountPlanLabel,
  getBillingStatusForUser,
  isFounderPlan,
  isPaidBillingStatus,
  mapStripeSubscriptionStatus,
  type BillingSubscriptionRecord,
} from "./billing-status";

const userId = "00000000-0000-4000-8000-000000000001";

function subscription(
  partial: Partial<BillingSubscriptionRecord> = {},
): BillingSubscriptionRecord {
  return {
    userId,
    status: "active",
    planKey: "founding_member",
    planLabel: "Founding Member",
    stripePriceId: "price_founder",
    ...partial,
  };
}

describe("billing status helpers", () => {
  it("maps Stripe statuses into DeepFlow billing states", () => {
    expect(mapStripeSubscriptionStatus("active")).toBe("active");
    expect(mapStripeSubscriptionStatus("trialing")).toBe("trialing");
    expect(mapStripeSubscriptionStatus("past_due")).toBe("past_due");
    expect(mapStripeSubscriptionStatus("unknown_future_status")).toBe("none");
    expect(mapStripeSubscriptionStatus(null)).toBe("none");
  });

  it("counts only active and trialing as paid", () => {
    expect(isPaidBillingStatus("active")).toBe(true);
    expect(isPaidBillingStatus("trialing")).toBe(true);

    for (const status of ["none", "incomplete", "past_due", "canceled", "unpaid", "paused"] as const) {
      expect(isPaidBillingStatus(status)).toBe(false);
    }
  });

  it("detects founder plan by stable plan key or configured Stripe price", () => {
    expect(isFounderPlan({ planKey: "founding_member" })).toBe(true);
    expect(isFounderPlan({
      planKey: null,
      stripePriceId: "price_founder",
      founderPriceId: "price_founder",
    })).toBe(true);
    expect(isFounderPlan({
      planKey: "other_plan",
      stripePriceId: "price_other",
      founderPriceId: "price_founder",
    })).toBe(false);
  });

  it("does not unlock founder features for inactive billing states", () => {
    expect(canUseFounderFeatures(subscription({ status: "active" }))).toBe(true);
    expect(canUseFounderFeatures(subscription({ status: "trialing" }))).toBe(true);

    for (const status of ["canceled", "past_due", "unpaid", "incomplete"] as const) {
      expect(canUseFounderFeatures(subscription({ status }))).toBe(false);
    }
  });

  it("derives account labels without fake active states", () => {
    expect(deriveAccountPlanLabel(null)).toBe("Free");
    expect(deriveAccountPlanLabel(subscription({ status: "canceled" }))).toBe("Free");
    expect(deriveAccountPlanLabel(subscription())).toBe("Founding Member");
    expect(deriveAccountPlanLabel(subscription({
      planKey: "founding_member",
      planLabel: null,
    }))).toBe("Founding Member");
  });

  it("fails closed to Free when no subscription lookup exists", async () => {
    await expect(getBillingStatusForUser(userId)).resolves.toMatchObject({
      status: "none",
      planLabel: "Free",
      isPaid: false,
      isFounder: false,
      canUseFounderFeatures: false,
    });
  });
});
