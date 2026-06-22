import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260621_create_profiles.sql"),
  "utf8",
);

describe("profiles migration", () => {
  it("creates the personal identity fields and protects them with RLS", () => {
    expect(migration).toContain("create table if not exists public.profiles");
    expect(migration).toContain("display_name text");
    expect(migration).toContain("avatar_color text not null default 'deep-green'");
    expect(migration).toContain("onboarding_completed boolean not null default false");
    expect(migration).toContain("alter table public.profiles enable row level security");
    expect(migration).toContain("auth.uid() = id");
  });

  it("creates a profile safely when Supabase Auth creates a user", () => {
    expect(migration).toContain("create or replace function public.handle_new_auth_user()");
    expect(migration).toContain("after insert on auth.users");
    expect(migration).toContain("on conflict (id) do nothing");
  });
});
