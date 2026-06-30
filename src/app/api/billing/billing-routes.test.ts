import { afterEach, describe, expect, it } from "vitest";

import { POST as createCheckoutSession } from "./create-checkout-session/route";
import { POST as createPortalSession } from "./create-portal-session/route";
import { GET as getBillingStatus } from "./status/route";
import { POST as billingWebhook } from "./webhook/route";

async function json(response: Response) {
  return response.json() as Promise<unknown>;
}

describe("billing route stubs", () => {
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it("does not create a checkout session before billing is active", async () => {
    const response = await createCheckoutSession();

    expect(response.status).toBe(501);
    await expect(json(response)).resolves.toEqual({
      ok: false,
      error: "billing_not_active",
      detail: "Billing is not active yet.",
    });
  });

  it("does not create a billing portal session before billing is active", async () => {
    const response = await createPortalSession();

    expect(response.status).toBe(501);
    await expect(json(response)).resolves.toMatchObject({
      ok: false,
      error: "billing_not_active",
    });
  });

  it("returns a fail-closed free billing status without exposing secrets", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_should_not_leak";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_should_not_leak";

    const response = await getBillingStatus();
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(payload).toContain('"billingActive":false');
    expect(payload).toContain('"label":"Free"');
    expect(payload).not.toContain("sk_test_should_not_leak");
    expect(payload).not.toContain("whsec_should_not_leak");
  });

  it("accepts a raw webhook body shape but does not process events yet", async () => {
    const response = await billingWebhook(new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      body: JSON.stringify({ id: "evt_test", type: "customer.subscription.updated" }),
    }));

    expect(response.status).toBe(501);
    await expect(json(response)).resolves.toMatchObject({
      ok: false,
      error: "billing_not_active",
    });
  });
});
