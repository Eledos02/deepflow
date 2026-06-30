# Stripe Billing Architecture

V7.6 prepares DeepFlow billing without activating Checkout. The free core
experience remains available, and billing state must fail closed to Free.

## Scope

- Prepare Stripe subscription architecture for a future V7.7 Checkout sprint.
- Do not redirect users to Stripe Checkout yet.
- Do not grant paid access from client-side URL parameters.
- Do not use billing state to block existing timers, Workspace, Focus Journal,
  Routines, Goals, Insights, Cloud Restore, or account cloud backup.

## Supabase Tables

`billing_customers`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `stripe_customer_id text unique not null`
- `email text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`
- `unique(user_id)`
- `unique(stripe_customer_id)`

`billing_subscriptions`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `stripe_customer_id text not null`
- `stripe_subscription_id text unique`
- `stripe_price_id text`
- `status text not null`
- `current_period_start timestamptz`
- `current_period_end timestamptz`
- `cancel_at_period_end boolean default false`
- `canceled_at timestamptz`
- `trial_start timestamptz`
- `trial_end timestamptz`
- `plan_key text`
- `plan_label text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Supported status values:

- `none`
- `incomplete`
- `trialing`
- `active`
- `past_due`
- `canceled`
- `unpaid`
- `paused`

`billing_events`

- `id uuid primary key default gen_random_uuid()`
- `stripe_event_id text unique not null`
- `event_type text not null`
- `processed_at timestamptz default now()`
- `processing_status text not null default 'processed'`
- `error_message text`
- `created_at timestamptz default now()`

Purpose: webhook idempotency and safe retry visibility.

## RLS And Access

- Users may select only their own billing customer/subscription rows.
- Users may not insert, update, or delete billing rows from the browser.
- `billing_events` has RLS enabled and no authenticated grants.
- V7.7 webhook/server code may use a server-only privileged Supabase client.
- Never expose the Supabase service role key to browser code.

## Customer Mapping

When V7.7 creates a Stripe customer:

- Derive the user from the authenticated server session.
- Use the authenticated Supabase user email for Stripe customer email.
- Store the Supabase `user_id` in Stripe customer metadata.
- Store the Stripe customer ID in `billing_customers`.
- Do not trust arbitrary client-provided `user_id`.

## Subscription Authority

Subscription state must come from webhook-confirmed Stripe events. Do not grant
paid access from a success URL, query parameter, localStorage value, or client
request body.

## V7.7 Checklist

- Add authenticated Checkout route implementation.
- Create Stripe customer if missing.
- Store `billing_customers` with server-only credentials.
- Create Checkout Session with `STRIPE_FOUNDER_PRICE_ID`.
- Add success/cancel URLs.
- Implement webhook verification and idempotency.
- Upsert `billing_subscriptions` from webhook events.
- Add customer portal session route after portal is configured.
- Add production QA for checkout, portal, webhook retries, and canceled states.
