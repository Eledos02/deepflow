import { NextResponse } from "next/server";

import {
  getSafeBillingConfigMessage,
  getStripeBillingConfig,
} from "../../../../features/billing/billing-plans";
import {
  authenticateBillingRequest,
  createSupabaseServiceClient,
  getSupabaseBillingConfig,
} from "../../../../features/billing/billing-supabase-server";
import {
  createCheckoutSessionForRequest,
  createStripeClient,
} from "../../../../features/billing/stripe-billing";
import { siteConfig } from "../../../../lib/site";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const billingConfig = getStripeBillingConfig(process.env, siteConfig.url);
  if (!billingConfig.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "billing_unavailable",
        detail: getSafeBillingConfigMessage(billingConfig.error),
      },
      { status: 503 },
    );
  }

  const supabaseConfig = getSupabaseBillingConfig();
  if (!supabaseConfig) {
    return NextResponse.json(
      {
        ok: false,
        error: "billing_unavailable",
        detail: "Billing is not configured correctly yet.",
      },
      { status: 503 },
    );
  }

  const user = await authenticateBillingRequest(request, supabaseConfig);
  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        error: "authentication_required",
        detail: "Sign in to continue to checkout.",
      },
      { status: 401 },
    );
  }

  const stripe = createStripeClient(billingConfig.config.secretKey);
  const supabase = createSupabaseServiceClient(supabaseConfig);
  const result = await createCheckoutSessionForRequest({
    request,
    stripe,
    supabase,
    config: billingConfig.config,
    user,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        detail: result.detail,
      },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true, url: result.url });
}
