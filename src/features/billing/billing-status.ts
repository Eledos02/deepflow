export const billingStatuses = [
  "none",
  "incomplete",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
] as const;

export type BillingStatus = (typeof billingStatuses)[number];

export type BillingSubscriptionRecord = {
  userId: string;
  status: BillingStatus;
  planKey: string | null;
  planLabel: string | null;
  stripePriceId: string | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
};

export type BillingStatusSummary = {
  status: BillingStatus;
  planKey: string | null;
  planLabel: string;
  isPaid: boolean;
  isFounder: boolean;
  canUseFounderFeatures: boolean;
  subscription: BillingSubscriptionRecord | null;
};

export type BillingSubscriptionLookup = (
  userId: string,
) => Promise<BillingSubscriptionRecord | null>;

const paidStatuses = new Set<BillingStatus>(["active", "trialing"]);
const statusSet = new Set<string>(billingStatuses);

export function mapStripeSubscriptionStatus(status: string | null | undefined): BillingStatus {
  if (!status) return "none";
  return statusSet.has(status) ? (status as BillingStatus) : "none";
}

export function isPaidBillingStatus(status: BillingStatus) {
  return paidStatuses.has(status);
}

export function isFounderPlan({
  planKey,
  stripePriceId,
  founderPriceId,
}: {
  planKey?: string | null;
  stripePriceId?: string | null;
  founderPriceId?: string | null;
}) {
  if (planKey === "founding_member") return true;
  if (!founderPriceId) return false;
  return stripePriceId === founderPriceId;
}

export function deriveAccountPlanLabel(subscription: BillingSubscriptionRecord | null) {
  if (!subscription || !isPaidBillingStatus(subscription.status)) return "Free";
  if (subscription.planLabel?.trim()) return subscription.planLabel.trim();
  if (subscription.planKey === "founding_member") return "Founding Member";
  return "Paid";
}

export function canUseFounderFeatures(
  subscription: BillingSubscriptionRecord | null,
  founderPriceId?: string | null,
) {
  if (!subscription || !isPaidBillingStatus(subscription.status)) return false;
  return isFounderPlan({
    planKey: subscription.planKey,
    stripePriceId: subscription.stripePriceId,
    founderPriceId,
  });
}

export async function getBillingStatusForUser(
  userId: string,
  options: {
    lookupSubscription?: BillingSubscriptionLookup;
    founderPriceId?: string | null;
  } = {},
): Promise<BillingStatusSummary> {
  const subscription = options.lookupSubscription
    ? await options.lookupSubscription(userId)
    : null;
  const status = subscription?.status ?? "none";
  const isPaid = isPaidBillingStatus(status);
  const isFounder = canUseFounderFeatures(subscription, options.founderPriceId);

  return {
    status,
    planKey: subscription?.planKey ?? null,
    planLabel: deriveAccountPlanLabel(subscription),
    isPaid,
    isFounder,
    canUseFounderFeatures: isFounder,
    subscription,
  };
}
