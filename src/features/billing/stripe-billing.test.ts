import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { StripeBillingConfig } from "./billing-plans";
import {
  createCheckoutSessionForRequest,
  createPortalSessionForRequest,
  handleStripeWebhookEvent,
} from "./stripe-billing";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "member@example.com",
};

const config: StripeBillingConfig = {
  secretKey: "sk_test_123",
  webhookSecret: "whsec_123",
  publishableKey: "pk_test_123",
  siteUrl: "https://deepflownow.com",
  plans: {
    monthly: {
      checkoutPlan: "monthly",
      planKey: "monthly",
      label: "Monthly",
      priceId: "price_monthly",
    },
    annual: {
      checkoutPlan: "annual",
      planKey: "annual",
      label: "Annual",
      priceId: "price_annual",
    },
    founder: {
      checkoutPlan: "founder",
      planKey: "founding_member",
      label: "Founding Member",
      priceId: "price_founder",
    },
  },
  founder: {
    active: true,
    maxSubscriptions: 2,
    endsAt: "2099-01-01T00:00:00.000Z",
  },
};

type FakeState = {
  customer: { user_id: string; stripe_customer_id: string; email: string | null } | null;
  founderCount: number;
  subscriptions: Array<Record<string, unknown>>;
  events: Set<string>;
  upserts: Record<string, Array<unknown>>;
};

function createSupabaseMock(overrides: Partial<FakeState> = {}) {
  const state: FakeState = {
    customer: null,
    founderCount: 0,
    subscriptions: [],
    events: new Set(),
    upserts: {
      billing_customers: [],
      billing_subscriptions: [],
      billing_events: [],
    },
    ...overrides,
  };

  function builder(table: string) {
    const filters: Record<string, unknown> = {};
    let countRequest = false;

    const query = {
      select(_columns: string, options?: { count?: string; head?: boolean }) {
        countRequest = Boolean(options?.count && options.head);
        return query;
      },
      eq(column: string, value: unknown) {
        filters[column] = value;
        return query;
      },
      in(column: string, value: unknown) {
        filters[column] = value;
        return query;
      },
      order() {
        return query;
      },
      limit() {
        return query;
      },
      async maybeSingle() {
        if (table === "billing_customers") {
          if (filters.user_id && state.customer?.user_id === filters.user_id) {
            return { data: state.customer, error: null };
          }
          if (
            filters.stripe_customer_id &&
            state.customer?.stripe_customer_id === filters.stripe_customer_id
          ) {
            return { data: state.customer, error: null };
          }
          return { data: null, error: null };
        }

        if (table === "billing_events") {
          const eventId = filters.stripe_event_id;
          return {
            data:
              typeof eventId === "string" && state.events.has(eventId)
                ? { stripe_event_id: eventId, processing_status: "processed" }
                : null,
            error: null,
          };
        }

        return { data: null, error: null };
      },
      async upsert(payload: unknown) {
        state.upserts[table]?.push(payload);

        if (table === "billing_customers") {
          const record = payload as {
            user_id: string;
            stripe_customer_id: string;
            email: string | null;
          };
          state.customer = record;
        }

        if (table === "billing_subscriptions") {
          state.subscriptions.unshift(payload as Record<string, unknown>);
        }

        if (table === "billing_events") {
          const record = payload as { stripe_event_id?: string };
          if (record.stripe_event_id) state.events.add(record.stripe_event_id);
        }

        return { error: null };
      },
      then(resolve: (value: unknown) => void) {
        if (table === "billing_subscriptions" && countRequest) {
          resolve({ count: state.founderCount, error: null });
          return;
        }

        if (table === "billing_subscriptions") {
          resolve({ data: state.subscriptions, error: null });
          return;
        }

        resolve({ data: null, error: null });
      },
    };

    return query;
  }

  return {
    state,
    supabase: {
      from: vi.fn((table: string) => builder(table)),
    } as unknown as SupabaseClient,
  };
}

function createStripeMock(subscriptionStatus: string = "active") {
  const sessionsCreate = vi.fn(async (payload) => ({
    id: "cs_test_123",
    url: "https://checkout.stripe.test/session",
    ...payload,
  }));
  const portalCreate = vi.fn(async () => ({
    id: "bps_test_123",
    url: "https://billing.stripe.test/session",
  }));
  const customerCreate = vi.fn(async () => ({ id: "cus_new" }));
  const customerRetrieve = vi.fn(async () => ({
    id: "cus_new",
    deleted: false,
    metadata: { user_id: user.id },
  }));
  const subscriptionRetrieve = vi.fn(async () =>
    subscription({ status: subscriptionStatus as Stripe.Subscription.Status }),
  );

  return {
    calls: {
      sessionsCreate,
      portalCreate,
      customerCreate,
      customerRetrieve,
      subscriptionRetrieve,
    },
    stripe: {
      checkout: { sessions: { create: sessionsCreate } },
      billingPortal: { sessions: { create: portalCreate } },
      customers: { create: customerCreate, retrieve: customerRetrieve },
      subscriptions: { retrieve: subscriptionRetrieve },
    } as unknown as Stripe,
  };
}

function subscription(partial: Partial<Stripe.Subscription> = {}) {
  return {
    id: "sub_test_123",
    customer: "cus_new",
    status: "active",
    current_period_start: 1_800_000_000,
    current_period_end: 1_802_592_000,
    cancel_at_period_end: false,
    canceled_at: null,
    trial_start: null,
    trial_end: null,
    metadata: { user_id: user.id, plan: "monthly" },
    items: { data: [{ price: { id: "price_monthly" } }] },
    ...partial,
  } as unknown as Stripe.Subscription;
}

function request(body: unknown, path = "/api/stripe/checkout") {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Stripe checkout orchestration", () => {
  it("rejects invalid plans and never accepts arbitrary client Price IDs", async () => {
    const { stripe } = createStripeMock();
    const { supabase } = createSupabaseMock();

    await expect(createCheckoutSessionForRequest({
      request: request({ plan: "price_founder", price: "price_founder" }),
      stripe,
      supabase,
      config,
      user,
    })).resolves.toMatchObject({
      ok: false,
      error: "invalid_plan",
    });
  });

  it("maps monthly and annual plans to server-side Price IDs only", async () => {
    const { stripe, calls } = createStripeMock();
    const { supabase } = createSupabaseMock();

    await createCheckoutSessionForRequest({
      request: request({ plan: "monthly", price: "price_attacker" }),
      stripe,
      supabase,
      config,
      user,
    });
    await createCheckoutSessionForRequest({
      request: request({ plan: "annual", price: "price_attacker" }),
      stripe,
      supabase,
      config,
      user,
    });

    expect(calls.sessionsCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        line_items: [{ price: "price_monthly", quantity: 1 }],
      }),
    );
    expect(calls.sessionsCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        line_items: [{ price: "price_annual", quantity: 1 }],
      }),
    );
  });

  it("allows founder checkout only when founder availability passes", async () => {
    const { stripe, calls } = createStripeMock();
    const { supabase } = createSupabaseMock({ founderCount: 1 });

    await expect(createCheckoutSessionForRequest({
      request: request({ plan: "founder" }),
      stripe,
      supabase,
      config,
      user,
    })).resolves.toMatchObject({ ok: true });

    expect(calls.sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_founder", quantity: 1 }],
      }),
    );
  });

  it("does not write subscription status from checkout creation", async () => {
    const { stripe } = createStripeMock();
    const { supabase, state } = createSupabaseMock();

    await createCheckoutSessionForRequest({
      request: request({ plan: "monthly" }),
      stripe,
      supabase,
      config,
      user,
    });

    expect(state.upserts.billing_customers).toHaveLength(1);
    expect(state.upserts.billing_subscriptions).toHaveLength(0);
  });
});

describe("Stripe portal orchestration", () => {
  it("handles missing Stripe customer safely", async () => {
    const { stripe } = createStripeMock();
    const { supabase } = createSupabaseMock();

    await expect(createPortalSessionForRequest({
      request: request({}, "/api/stripe/portal"),
      stripe,
      supabase,
      config,
      user,
    })).resolves.toMatchObject({
      ok: false,
      error: "portal_unavailable",
    });
  });

  it("creates a portal session when a billing customer exists", async () => {
    const { stripe, calls } = createStripeMock();
    const { supabase } = createSupabaseMock({
      customer: {
        user_id: user.id,
        stripe_customer_id: "cus_existing",
        email: user.email,
      },
    });

    await expect(createPortalSessionForRequest({
      request: request({}, "/api/stripe/portal"),
      stripe,
      supabase,
      config,
      user,
    })).resolves.toMatchObject({ ok: true });

    expect(calls.portalCreate).toHaveBeenCalledWith({
      customer: "cus_existing",
      return_url: "http://localhost:3000/account",
    });
  });
});

describe("Stripe webhook orchestration", () => {
  it("handles checkout.session.completed by upserting customer and subscription", async () => {
    const { stripe } = createStripeMock();
    const { supabase, state } = createSupabaseMock();

    await expect(handleStripeWebhookEvent({
      stripe,
      supabase,
      config,
      event: {
        id: "evt_checkout",
        type: "checkout.session.completed",
        data: {
          object: {
            customer: "cus_new",
            subscription: "sub_test_123",
            client_reference_id: user.id,
            metadata: { user_id: user.id, plan: "monthly" },
            customer_details: { email: user.email },
          },
        },
      } as unknown as Stripe.Event,
    })).resolves.toEqual({ ok: true, status: "processed" });

    expect(state.upserts.billing_customers).toHaveLength(1);
    expect(state.upserts.billing_subscriptions[0]).toMatchObject({
      status: "active",
      plan_key: "monthly",
      stripe_price_id: "price_monthly",
    });
  });

  it("handles subscription updates and deletes idempotently", async () => {
    const { stripe } = createStripeMock();
    const { supabase, state } = createSupabaseMock({
      customer: {
        user_id: user.id,
        stripe_customer_id: "cus_new",
        email: user.email,
      },
    });

    await handleStripeWebhookEvent({
      stripe,
      supabase,
      config,
      event: {
        id: "evt_updated",
        type: "customer.subscription.updated",
        data: { object: subscription({ status: "past_due" }) },
      } as unknown as Stripe.Event,
    });
    await handleStripeWebhookEvent({
      stripe,
      supabase,
      config,
      event: {
        id: "evt_deleted",
        type: "customer.subscription.deleted",
        data: { object: subscription({ status: "canceled" }) },
      } as unknown as Stripe.Event,
    });

    expect(state.upserts.billing_subscriptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "past_due" }),
        expect.objectContaining({ status: "canceled" }),
      ]),
    );

    await expect(handleStripeWebhookEvent({
      stripe,
      supabase,
      config,
      event: {
        id: "evt_deleted",
        type: "customer.subscription.deleted",
        data: { object: subscription({ status: "canceled" }) },
      } as unknown as Stripe.Event,
    })).resolves.toEqual({ ok: true, status: "skipped" });
  });

  it("handles invoice.payment_failed by syncing the Stripe subscription state", async () => {
    const { stripe } = createStripeMock("past_due");
    const { supabase, state } = createSupabaseMock({
      customer: {
        user_id: user.id,
        stripe_customer_id: "cus_new",
        email: user.email,
      },
    });

    await handleStripeWebhookEvent({
      stripe,
      supabase,
      config,
      event: {
        id: "evt_invoice_failed",
        type: "invoice.payment_failed",
        data: { object: { subscription: "sub_test_123" } },
      } as unknown as Stripe.Event,
    });

    expect(state.upserts.billing_subscriptions[0]).toMatchObject({
      status: "past_due",
    });
  });
});
