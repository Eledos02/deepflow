# Stripe Environment Variables

V7.6 does not require Stripe environment variables for normal builds. Billing
routes are stubs and return safe inactive responses until Checkout is
implemented in a later sprint.

## Required For V7.7 Checkout

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_FOUNDER_PRICE_ID`
- `NEXT_PUBLIC_SITE_URL`

## Rules

- `STRIPE_SECRET_KEY` is server-only.
- `STRIPE_WEBHOOK_SECRET` is server-only.
- `STRIPE_FOUNDER_PRICE_ID` is server-only for Checkout creation.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is safe for browser use only when Stripe
  client code is intentionally added.
- Do not log secrets.
- Do not expose server secrets through API JSON.
- Missing Stripe env vars should produce safe server errors only when billing
  actions are called.

## Stripe Dashboard Setup Checklist

- Create a Stripe account or use an existing Stripe account.
- Create product: `DeepFlow Founding Member`.
- Create a recurring price.
- Copy the price ID into `STRIPE_FOUNDER_PRICE_ID`.
- Configure the customer portal.
- Add webhook endpoint:
  - Production: `https://deepflownow.com/api/billing/webhook`
  - Local testing: use Stripe CLI if needed.
- Select webhook events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- Copy webhook signing secret into `STRIPE_WEBHOOK_SECRET`.
- Add all env vars in Vercel.

## Local Development

Use test-mode Stripe keys only. Do not place live secrets in `.env.example`,
docs, tests, screenshots, or browser-exposed variables.
