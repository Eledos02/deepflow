import { NextResponse } from "next/server";

import { getStripeBillingConfig } from "../../../../features/billing/billing-plans";
import { getBillingStatusForUser } from "../../../../features/billing/billing-status";
import {
  authenticateBillingRequest,
  createSupabaseServiceClient,
  findBestBillingSubscriptionForUser,
  findBillingCustomerForUser,
  getSupabaseBillingConfig,
} from "../../../../features/billing/billing-supabase-server";
import { siteConfig } from "../../../../lib/site";

export const runtime = "nodejs";

const freePlan = {
  status: "none",
  label: "Free",
  isPaid: false,
  isFounder: false,
  canUseFounderFeatures: false,
  planKey: null,
  hasCustomer: false,
};

export async function GET(request: Request) {
  const billingConfig = getStripeBillingConfig(process.env, siteConfig.url);
  const supabaseConfig = getSupabaseBillingConfig();

  if (!billingConfig.ok || !supabaseConfig) {
    return NextResponse.json({
      ok: true,
      billingActive: false,
      plan: freePlan,
    });
  }

  const user = await authenticateBillingRequest(request, supabaseConfig);
  if (!user) {
    return NextResponse.json({
      ok: true,
      billingActive: true,
      plan: freePlan,
    });
  }

  const supabase = createSupabaseServiceClient(supabaseConfig);
  const [summary, customer] = await Promise.all([
    getBillingStatusForUser(user.id, {
      founderPriceId: billingConfig.config.plans.founder.priceId,
      lookupSubscription: (userId) =>
        findBestBillingSubscriptionForUser(supabase, userId),
    }),
    findBillingCustomerForUser(supabase, user.id),
  ]);

  return NextResponse.json({
    ok: true,
    billingActive: true,
    plan: {
      status: summary.status,
      label: summary.planLabel,
      isPaid: summary.isPaid,
      isFounder: summary.isFounder,
      canUseFounderFeatures: summary.canUseFounderFeatures,
      planKey: summary.planKey,
      hasCustomer: Boolean(customer),
      currentPeriodEnd: summary.subscription?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: summary.subscription?.cancelAtPeriodEnd ?? false,
    },
  });
}
