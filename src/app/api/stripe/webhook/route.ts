import { NextResponse } from "next/server";

import {
  getSafeBillingConfigMessage,
  getStripeBillingConfig,
} from "../../../../features/billing/billing-plans";
import {
  createSupabaseServiceClient,
  getSupabaseBillingConfig,
} from "../../../../features/billing/billing-supabase-server";
import {
  createStripeClient,
  handleStripeWebhookEvent,
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

  if (!billingConfig.config.webhookSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: "billing_unavailable",
        detail: "Billing webhooks are not configured yet.",
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

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const stripe = createStripeClient(billingConfig.config.secretKey);

  if (!signature) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_signature",
        detail: "Webhook signature is missing.",
      },
      { status: 400 },
    );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      billingConfig.config.webhookSecret,
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_signature",
        detail: "Webhook signature could not be verified.",
      },
      { status: 400 },
    );
  }

  const result = await handleStripeWebhookEvent({
    stripe,
    supabase: createSupabaseServiceClient(supabaseConfig),
    config: billingConfig.config,
    event,
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

  return NextResponse.json({ ok: true, status: result.status });
}
