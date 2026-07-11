export type AccountBillingPlanPresentationInput = {
  status: string;
  isPaid: boolean;
  cancelAtPeriodEnd?: boolean;
};

export type AccountBillingPresentation = {
  statusLine: string;
  periodLine: string | null;
  hasScheduledCancellation: boolean;
};

export function getAccountBillingPresentation(
  plan: AccountBillingPlanPresentationInput | null,
  periodEnd: string | null,
): AccountBillingPresentation {
  if (!plan) {
    return {
      statusLine: "Checking billing status...",
      periodLine: null,
      hasScheduledCancellation: false,
    };
  }

  if (plan.isPaid && plan.cancelAtPeriodEnd) {
    return {
      statusLine: periodEnd ? `Active until ${periodEnd}` : "Active until period end",
      periodLine: "Cancellation scheduled",
      hasScheduledCancellation: true,
    };
  }

  if (plan.isPaid) {
    return {
      statusLine: "Active",
      periodLine: periodEnd ? `Current period ends ${periodEnd}.` : null,
      hasScheduledCancellation: false,
    };
  }

  if (plan.status === "past_due" || plan.status === "unpaid") {
    return {
      statusLine: "Payment issue",
      periodLine: null,
      hasScheduledCancellation: false,
    };
  }

  return {
    statusLine: "Free",
    periodLine: null,
    hasScheduledCancellation: false,
  };
}
