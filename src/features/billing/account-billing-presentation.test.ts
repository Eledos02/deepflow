import { describe, expect, it } from "vitest";

import { getAccountBillingPresentation } from "./account-billing-presentation";

describe("account billing presentation", () => {
  it("shows an active subscription without scheduled cancellation", () => {
    expect(getAccountBillingPresentation({
      status: "active",
      isPaid: true,
      cancelAtPeriodEnd: false,
    }, "August 11, 2026")).toEqual({
      statusLine: "Active",
      periodLine: "Current period ends August 11, 2026.",
      hasScheduledCancellation: false,
    });
  });

  it("keeps a scheduled-to-cancel subscription active through its period end", () => {
    expect(getAccountBillingPresentation({
      status: "active",
      isPaid: true,
      cancelAtPeriodEnd: true,
    }, "August 11, 2026")).toEqual({
      statusLine: "Active until August 11, 2026",
      periodLine: "Cancellation scheduled",
      hasScheduledCancellation: true,
    });
  });

  it("presents canceled and inactive subscriptions as free", () => {
    expect(getAccountBillingPresentation({
      status: "canceled",
      isPaid: false,
      cancelAtPeriodEnd: false,
    }, "August 11, 2026")).toEqual({
      statusLine: "Free",
      periodLine: null,
      hasScheduledCancellation: false,
    });
  });
});
