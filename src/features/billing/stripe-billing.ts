import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  checkFounderAvailability,
  parseCheckoutPlan,
  planFromPriceId,
  resolveRequestOrigin,
  type CheckoutPlan,
  type StripeBillingConfig,
} from "./billing-plans";
import {
  countActiveFounderSubscriptions,
  findBillingCustomerByStripeId,
  findBillingCustomerForUser,
  hasProcessedBillingEvent,
  recordBillingEvent,
  upsertBillingCustomer,
  upsertBillingSubscription,
  type AuthenticatedBillingUser,
} from "./billing-supabase-server";

export const STRIPE_API_VERSION = "2026-06-24.dahlia";

export type StripeClient = Stripe;

export type CheckoutResult =
  | { ok: true; url: string }
  | {
      ok: false;
      status: number;
      error:
        | "invalid_plan"
        | "founder_unavailable"
        | "billing_unavailable"
        | "checkout_failed";
      detail: string;
    };

export type PortalResult =
  | { ok: true; url: string }
  | {
      ok: false;
      status: number;
      error: "portal_unavailable" | "billing_unavailable" | "portal_failed";
      detail: string;
    };

export type WebhookResult =
  | { ok: true; status: "processed" | "skipped" }
  | { ok: false; status: number; error: string; detail: string };

export function createStripeClient(secretKey: string) {
  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
  });
}

async function requestBodyPlan(request: Request) {
  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") return null;
  return parseCheckoutPlan((payload as { plan?: unknown }).plan);
}

async function getOrCreateStripeCustomer({
  stripe,
  supabase,
  user,
}: {
  stripe: StripeClient;
  supabase: SupabaseClient;
  user: AuthenticatedBillingUser;
}) {
  const existingCustomer = await findBillingCustomerForUser(supabase, user.id);
  if (existingCustomer) return existingCustomer.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    metadata: {
      user_id: user.id,
    },
  });

  await upsertBillingCustomer(supabase, {
    userId: user.id,
    stripeCustomerId: customer.id,
    email: user.email,
  });

  return customer.id;
}

export async function createCheckoutSessionForRequest({
  request,
  stripe,
  supabase,
  config,
  user,
}: {
  request: Request;
  stripe: StripeClient;
  supabase: SupabaseClient;
  config: StripeBillingConfig;
  user: AuthenticatedBillingUser;
}): Promise<CheckoutResult> {
  const plan = await requestBodyPlan(request);
  if (!plan) {
    return {
      ok: false,
      status: 400,
      error: "invalid_plan",
      detail: "Choose a valid DeepFlow plan.",
    };
  }

  const definition = config.plans[plan];

  if (plan === "founder") {
    let activeFounderCount: number | null = null;

    try {
      activeFounderCount = await countActiveFounderSubscriptions(supabase);
    } catch {
      activeFounderCount = null;
    }

    const availability = checkFounderAvailability({
      config: config.founder,
      activeFounderCount,
    });

    if (!availability.available) {
      return {
        ok: false,
        status: 403,
        error: "founder_unavailable",
        detail: "The Founding Member price is no longer available.",
      };
    }
  }

  try {
    const customerId = await getOrCreateStripeCustomer({ stripe, supabase, user });
    const origin = resolveRequestOrigin(request, config.siteUrl);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [
        {
          price: definition.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan,
        },
      },
      success_url: `${origin}/account?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
    });

    return session.url
      ? { ok: true, url: session.url }
      : {
          ok: false,
          status: 502,
          error: "checkout_failed",
          detail: "Could not start checkout right now.",
        };
  } catch {
    return {
      ok: false,
      status: 502,
      error: "checkout_failed",
      detail: "Could not start checkout right now.",
    };
  }
}

export async function createPortalSessionForRequest({
  request,
  stripe,
  supabase,
  config,
  user,
}: {
  request: Request;
  stripe: StripeClient;
  supabase: SupabaseClient;
  config: StripeBillingConfig;
  user: AuthenticatedBillingUser;
}): Promise<PortalResult> {
  const customer = await findBillingCustomerForUser(supabase, user.id);
  if (!customer) {
    return {
      ok: false,
      status: 404,
      error: "portal_unavailable",
      detail: "No billing portal is available for this account yet.",
    };
  }

  try {
    const origin = resolveRequestOrigin(request, config.siteUrl);
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripeCustomerId,
      return_url: `${origin}/account`,
    });

    return session.url
      ? { ok: true, url: session.url }
      : {
          ok: false,
          status: 502,
          error: "portal_failed",
          detail: "Could not open billing management right now.",
        };
  } catch {
    return {
      ok: false,
      status: 502,
      error: "portal_failed",
      detail: "Could not open billing management right now.",
    };
  }
}

function objectId(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function unixToIso(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

function planFromMetadata(value: unknown): CheckoutPlan | null {
  return parseCheckoutPlan(value);
}

function firstSubscriptionPrice(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price?.id ?? null;
}

function subscriptionPeriodStart(subscription: Stripe.Subscription) {
  const legacyValue = (subscription as unknown as { current_period_start?: number })
    .current_period_start;
  return legacyValue ?? subscription.items.data[0]?.current_period_start ?? null;
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const legacyValue = (subscription as unknown as { current_period_end?: number })
    .current_period_end;
  return legacyValue ?? subscription.items.data[0]?.current_period_end ?? null;
}

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const legacyValue = (invoice as unknown as { subscription?: unknown })
    .subscription;
  const parentValue = invoice.parent?.subscription_details?.subscription;

  return objectId(
    (legacyValue ?? parentValue) as string | { id: string } | null | undefined,
  );
}

async function upsertSubscriptionFromStripe({
  stripe,
  supabase,
  config,
  subscription,
  fallbackUserId,
  fallbackPlan,
}: {
  stripe: StripeClient;
  supabase: SupabaseClient;
  config: StripeBillingConfig;
  subscription: Stripe.Subscription;
  fallbackUserId?: string | null;
  fallbackPlan?: CheckoutPlan | null;
}) {
  const customerId = objectId(subscription.customer);
  if (!customerId) throw new Error("subscription_customer_missing");

  const priceId = firstSubscriptionPrice(subscription);
  const metadataPlan = planFromMetadata(subscription.metadata?.plan);
  const plan =
    (metadataPlan ? config.plans[metadataPlan] : null) ??
    planFromPriceId(priceId, config.plans) ??
    (fallbackPlan ? config.plans[fallbackPlan] : null);

  let userId = typeof subscription.metadata?.user_id === "string"
    ? subscription.metadata.user_id
    : fallbackUserId ?? null;

  let customer = await findBillingCustomerByStripeId(supabase, customerId);
  if (!userId && customer) userId = customer.userId;

  if (!userId) {
    const stripeCustomer = await stripe.customers.retrieve(customerId);
    if (!stripeCustomer.deleted && typeof stripeCustomer.metadata?.user_id === "string") {
      userId = stripeCustomer.metadata.user_id;
    }
  }

  if (!userId) throw new Error("subscription_user_missing");

  if (!customer) {
    await upsertBillingCustomer(supabase, {
      userId,
      stripeCustomerId: customerId,
      email: null,
    });
    customer = await findBillingCustomerByStripeId(supabase, customerId);
  }

  await upsertBillingSubscription(supabase, {
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    status: subscription.status,
    currentPeriodStart: unixToIso(subscriptionPeriodStart(subscription)),
    currentPeriodEnd: unixToIso(subscriptionPeriodEnd(subscription)),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: unixToIso(subscription.canceled_at),
    trialStart: unixToIso(subscription.trial_start),
    trialEnd: unixToIso(subscription.trial_end),
    planKey: plan?.planKey ?? null,
    planLabel: plan?.label ?? null,
  });
}

async function processCheckoutCompleted({
  stripe,
  supabase,
  config,
  session,
}: {
  stripe: StripeClient;
  supabase: SupabaseClient;
  config: StripeBillingConfig;
  session: Stripe.Checkout.Session;
}) {
  const userId =
    (typeof session.metadata?.user_id === "string" ? session.metadata.user_id : null) ??
    session.client_reference_id ??
    null;
  const customerId = objectId(session.customer);
  const subscriptionId = objectId(session.subscription);
  const plan = planFromMetadata(session.metadata?.plan);

  if (userId && customerId) {
    await upsertBillingCustomer(supabase, {
      userId,
      stripeCustomerId: customerId,
      email: session.customer_details?.email ?? null,
    });
  }

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await upsertSubscriptionFromStripe({
      stripe,
      supabase,
      config,
      subscription,
      fallbackUserId: userId,
      fallbackPlan: plan,
    });
  }
}

async function processInvoiceSubscription({
  stripe,
  supabase,
  config,
  invoice,
}: {
  stripe: StripeClient;
  supabase: SupabaseClient;
  config: StripeBillingConfig;
  invoice: Stripe.Invoice;
}) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertSubscriptionFromStripe({
    stripe,
    supabase,
    config,
    subscription,
  });
}

export async function handleStripeWebhookEvent({
  stripe,
  supabase,
  config,
  event,
}: {
  stripe: StripeClient;
  supabase: SupabaseClient;
  config: StripeBillingConfig;
  event: Stripe.Event;
}): Promise<WebhookResult> {
  if (await hasProcessedBillingEvent(supabase, event.id)) {
    return { ok: true, status: "skipped" };
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await processCheckoutCompleted({
          stripe,
          supabase,
          config,
          session: event.data.object as Stripe.Checkout.Session,
        });
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await upsertSubscriptionFromStripe({
          stripe,
          supabase,
          config,
          subscription: event.data.object as Stripe.Subscription,
        });
        break;
      case "invoice.payment_succeeded":
      case "invoice.paid":
      case "invoice.payment_failed":
        await processInvoiceSubscription({
          stripe,
          supabase,
          config,
          invoice: event.data.object as Stripe.Invoice,
        });
        break;
      default:
        await recordBillingEvent(supabase, {
          stripeEventId: event.id,
          eventType: event.type,
          processingStatus: "skipped",
        });
        return { ok: true, status: "skipped" };
    }

    await recordBillingEvent(supabase, {
      stripeEventId: event.id,
      eventType: event.type,
    });

    return { ok: true, status: "processed" };
  } catch (error) {
    await recordBillingEvent(supabase, {
      stripeEventId: event.id,
      eventType: event.type,
      processingStatus: "failed",
      errorMessage:
        error instanceof Error ? error.message.slice(0, 240) : "webhook_failed",
    });

    return {
      ok: false,
      status: 500,
      error: "webhook_processing_failed",
      detail: "Webhook could not be processed.",
    };
  }
}
