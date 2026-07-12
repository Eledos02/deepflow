import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as createCheckoutSession } from "../stripe/checkout/route";
import { POST as createPortalSession } from "../stripe/portal/route";
import { POST as billingWebhook } from "../stripe/webhook/route";
import { POST as createCompatibilityCheckoutSession } from "./create-checkout-session/route";
import { GET as getBillingStatus } from "./status/route";

async function json(response: Response) {
  return response.json() as Promise<unknown>;
}

const billingEnv = {
  BILLING_CHECKOUT_ENABLED: "true",
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
    vi.restoreAllMocks();
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["false", "false"],
    ["invalid", "enabled"],
  ])("disables checkout for a %s launch flag without making external calls", async (_label, value) => {
    setBillingEnv();
    if (value === undefined) {
      delete process.env.BILLING_CHECKOUT_ENABLED;
    } else {
      process.env.BILLING_CHECKOUT_ENABLED = value;
    }
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await createCheckoutSession(new Request("http://localhost/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "monthly" }),
    }));

    expect(response.status).toBe(503);
    await expect(json(response)).resolves.toEqual({
      ok: false,
      error: "checkout_disabled",
      detail: "Paid plans are not available yet.",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("applies the launch hold to the compatibility checkout route", async () => {
    setBillingEnv();
    process.env.BILLING_CHECKOUT_ENABLED = "false";

    const response = await createCompatibilityCheckoutSession(new Request(
      "http://localhost/api/billing/create-checkout-session",
      { method: "POST", body: JSON.stringify({ plan: "annual" }) },
    ));

    expect(response.status).toBe(503);
    await expect(json(response)).resolves.toMatchObject({
      ok: false,
      error: "checkout_disabled",
    });
  });

  it("exact true enables the existing authenticated checkout flow", async () => {
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
    process.env.BILLING_CHECKOUT_ENABLED = "false";

    const response = await createPortalSession(new Request("http://localhost/api/stripe/portal", {
      method: "POST",
    }));

    expect(response.status).toBe(401);
    await expect(json(response)).resolves.toMatchObject({
      ok: false,
      error: "authentication_required",
    });
  });

  it("returns the existing billing config failure after checkout is enabled", async () => {
    process.env.BILLING_CHECKOUT_ENABLED = "true";
    process.env.STRIPE_SECRET_KEY = "sk_test_should_not_leak";

    const response = await createCheckoutSession(new Request(
      "http://localhost/api/stripe/checkout",
      { method: "POST", body: JSON.stringify({ plan: "monthly" }) },
    ));
    const payload = await response.text();

    expect(response.status).toBe(503);
    expect(payload).toContain("billing_unavailable");
    expect(payload).not.toContain("sk_test_should_not_leak");
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
