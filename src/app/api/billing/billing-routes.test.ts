import { afterEach, describe, expect, it } from "vitest";

import { POST as createCheckoutSession } from "../stripe/checkout/route";
import { POST as createPortalSession } from "../stripe/portal/route";
import { POST as billingWebhook } from "../stripe/webhook/route";
import { GET as getBillingStatus } from "./status/route";

async function json(response: Response) {
  return response.json() as Promise<unknown>;
}

const billingEnv = {
  STRIPE_SECRET_KEY: "sk_test_should_not_leak",
  STRIPE_WEBHOOK_SECRET: "whsec_should_not_leak",
  STRIPE_MONTHLY_PRICE_ID: "price_monthly",
  STRIPE_ANNUAL_PRICE_ID: "price_annual",
  STRIPE_FOUNDER_PRICE_ID: "price_founder",
  FOUNDER_PLAN_ACTIVE: "true",
  FOUNDER_PLAN_MAX_SUBSCRIPTIONS: "10",
  FOUNDER_PLAN_ENDS_AT: "2099-01-01T00:00:00.000Z",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

function setBillingEnv() {
  Object.assign(process.env, billingEnv);
}

function cleanupBillingEnv() {
  for (const key of Object.keys(billingEnv)) {
    delete process.env[key];
  }
}

describe("Stripe billing routes", () => {
  afterEach(() => {
    cleanupBillingEnv();
  });

  it("fails closed without exposing secrets when billing env vars are missing", async () => {
    const response = await createCheckoutSession(new Request("http://localhost/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "monthly" }),
    }));
    const payload = await response.text();

    expect(response.status).toBe(503);
    expect(payload).toContain("billing_unavailable");
    expect(payload).not.toContain("sk_test");
    expect(payload).not.toContain("whsec");
  });

  it("checkout rejects unauthenticated users before creating a session", async () => {
    setBillingEnv();

    const response = await createCheckoutSession(new Request("http://localhost/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "monthly" }),
    }));

    expect(response.status).toBe(401);
    await expect(json(response)).resolves.toMatchObject({
      ok: false,
      error: "authentication_required",
    });
  });

  it("portal rejects unauthenticated users before creating a session", async () => {
    setBillingEnv();

    const response = await createPortalSession(new Request("http://localhost/api/stripe/portal", {
      method: "POST",
    }));

    expect(response.status).toBe(401);
    await expect(json(response)).resolves.toMatchObject({
      ok: false,
      error: "authentication_required",
    });
  });

  it("returns a fail-closed free billing status without exposing secrets", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_should_not_leak";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_should_not_leak";

    const response = await getBillingStatus(new Request("http://localhost/api/billing/status"));
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(payload).toContain('"billingActive":false');
    expect(payload).toContain('"label":"Free"');
    expect(payload).not.toContain("sk_test_should_not_leak");
    expect(payload).not.toContain("whsec_should_not_leak");
  });

  it("webhook rejects invalid signatures with a safe 400", async () => {
    setBillingEnv();

    const response = await billingWebhook(new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "invalid" },
      body: JSON.stringify({
        id: "evt_test",
        type: "customer.subscription.updated",
      }),
    }));

    expect(response.status).toBe(400);
    await expect(json(response)).resolves.toMatchObject({
      ok: false,
      error: "invalid_signature",
    });
  });
});
