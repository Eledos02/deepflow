# Stripe Environment Variables

V7.7 configures Stripe Checkout and verified webhooks. V7.7.1 keeps new
checkout sessions behind a server-authoritative launch-control flag. Missing
billing environment values must fail closed and never grant paid access.

## Required For V7.7 Checkout

- `BILLING_CHECKOUT_ENABLED=false`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_MONTHLY_PRICE_ID`
- `STRIPE_ANNUAL_PRICE_ID`
- `STRIPE_FOUNDER_PRICE_ID`
- `FOUNDER_PLAN_ACTIVE`
- `FOUNDER_PLAN_MAX_SUBSCRIPTIONS`
- `FOUNDER_PLAN_ENDS_AT`
- `NEXT_PUBLIC_SITE_URL`

## Rules

- `BILLING_CHECKOUT_ENABLED` is the production launch-control flag. Checkout is
  enabled only when its normalized value is exactly `true`; missing, empty,
  invalid, and `false` values disable new purchases.
- Production must keep `BILLING_CHECKOUT_ENABLED=false` until DeepFlow Pro is
  ready for public purchase.
- Stripe remains configured while checkout is held. Existing subscriptions,
  billing status, verified webhooks, and Customer Portal access remain active.
- Changing `BILLING_CHECKOUT_ENABLED` requires a redeploy. Do not automatically
  enable it in Preview deployments.
- `STRIPE_SECRET_KEY` is server-only.
- `STRIPE_WEBHOOK_SECRET` is server-only.
- Stripe Price IDs are server-only for Checkout creation.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is safe for browser use only when Stripe
  client code is intentionally added.
- Do not log secrets.
- Do not expose server secrets through API JSON.
- Missing Stripe env vars should produce safe server errors only when billing
  actions are called.

## Stripe Dashboard Setup Checklist

- Create a Stripe account or use an existing Stripe account.
- Create product: `DeepFlow`.
- Create recurring test prices:
  - Monthly: `$4.99/month`, copy to `STRIPE_MONTHLY_PRICE_ID`.
  - Annual: `$39/year`, copy to `STRIPE_ANNUAL_PRICE_ID`.
  - Founding Member: `$29/year`, copy to `STRIPE_FOUNDER_PRICE_ID`.
- Configure the customer portal.
- Add webhook endpoint:
  - Production: `https://deepflownow.com/api/stripe/webhook`
  - Local testing: use Stripe CLI if needed.
- Select webhook events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.paid`
  - `invoice.payment_failed`
- Copy webhook signing secret into `STRIPE_WEBHOOK_SECRET`.
- Add all env vars in Vercel.

## Local Development

Use test-mode Stripe keys only. Do not place live secrets in `.env.example`,
docs, tests, screenshots, or browser-exposed variables.

Controlled local or sandbox checkout QA may temporarily set:

```dotenv
BILLING_CHECKOUT_ENABLED=true
```

Every environment remains fail-closed unless that value is explicitly enabled.
