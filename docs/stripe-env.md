# Stripe Environment Variables

V7.7 activates Stripe Checkout and verified webhooks in sandbox/test mode.
Missing billing environment values must fail closed and never grant paid access.

## Required For V7.7 Checkout

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
