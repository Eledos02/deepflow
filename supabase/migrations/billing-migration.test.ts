import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260627_create_billing_tables.sql"),
  "utf8",
);
const serviceRoleMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260711_grant_billing_service_role.sql",
  ),
  "utf8",
);

describe("billing migration", () => {
  it("creates billing customer, subscription, and event tables", () => {
    expect(migration).toContain("create table if not exists public.billing_customers");
    expect(migration).toContain("create table if not exists public.billing_subscriptions");
    expect(migration).toContain("create table if not exists public.billing_events");
    expect(migration).toContain("stripe_customer_id text unique not null");
    expect(migration).toContain("stripe_subscription_id text unique");
    expect(migration).toContain("stripe_event_id text unique not null");
  });

  it("supports expected Stripe subscription states", () => {
    for (const status of [
      "none",
      "incomplete",
      "trialing",
      "active",
      "past_due",
      "canceled",
      "unpaid",
      "paused",
    ]) {
      expect(migration).toContain(`'${status}'`);
    }
  });

  it("allows users to read only their own billing rows and not write from the browser", () => {
    expect(migration).toContain("alter table public.billing_customers enable row level security");
    expect(migration).toContain("alter table public.billing_subscriptions enable row level security");
    expect(migration).toContain("alter table public.billing_events enable row level security");
    expect(migration).toContain("using (auth.uid() = user_id)");
    expect(migration).toContain("grant select on public.billing_customers to authenticated");
    expect(migration).toContain("grant select on public.billing_subscriptions to authenticated");
    expect(migration).not.toContain("grant insert");
    expect(migration).not.toContain("grant update");
    expect(migration).not.toContain("grant delete");
    expect(migration).not.toContain(" to anon");
  });
});

describe("billing service role migration", () => {
  it("grants only the required billing table privileges to service_role", () => {
    for (const table of [
      "billing_customers",
      "billing_subscriptions",
      "billing_events",
    ]) {
      expect(serviceRoleMigration).toMatch(
        new RegExp(
          `grant\\s+select,\\s*insert,\\s*update\\s+on table\\s+public\\.${table}\\s+to service_role;`,
          "i",
        ),
      );
    }

    expect(serviceRoleMigration).not.toMatch(/\b(delete|truncate|references|trigger)\b/i);
    expect(serviceRoleMigration).not.toMatch(/\bto\s+(anon|authenticated)\b/i);
    expect(serviceRoleMigration).not.toMatch(/disable\s+row\s+level\s+security/i);
    expect(serviceRoleMigration).not.toMatch(/\b(drop|revoke)\b/i);
  });
});
