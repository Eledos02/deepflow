# Stripe Webhook Events

V7.7 verifies Stripe signatures, stores event IDs, and updates billing tables
from server-confirmed Stripe state.

## Events To Handle

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.paid`
- `invoice.payment_failed`

## Idempotency

Before processing an event:

- Verify the Stripe signature using `STRIPE_WEBHOOK_SECRET`.
- Check `billing_events.stripe_event_id`.
- If the event has already been processed, return success without duplicating
  side effects.
- Insert the event ID before or within the same transaction as subscription
  updates.
- Mark failed processing with `processing_status = 'failed'` and a safe error
  summary.

## Subscription Mapping

Use Stripe customer ID to find `billing_customers`. If needed, use Stripe
customer metadata containing Supabase `user_id`, then persist the mapping.

Do not trust:

- Client-provided `user_id`
- Checkout success URLs
- Query parameters
- Browser localStorage

## Status Handling

Treat `active` and `trialing` as paid. Treat all unknown, missing, incomplete,
past due, unpaid, canceled, or paused states as not paid for product access.

## Failure Mode

Billing state must fail closed. If webhook processing is delayed or unavailable,
the app should show Free or billing-unavailable copy and keep existing free
functionality usable.
