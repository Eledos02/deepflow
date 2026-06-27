import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260626_create_cloud_sync_tables.sql"),
  "utf8",
);

describe("cloud sync migration", () => {
  it("creates the V7.1 user-owned sync tables", () => {
    expect(migration).toContain("create table if not exists public.focus_sessions");
    expect(migration).toContain("create table if not exists public.focus_goals");
    expect(migration).toContain("create table if not exists public.focus_routines");
    expect(migration).toContain("user_id uuid not null references auth.users(id) on delete cascade");
    expect(migration).toContain("unique(user_id, local_id)");
  });

  it("enables RLS and restricts access to each authenticated user", () => {
    expect(migration).toContain("alter table public.focus_sessions enable row level security");
    expect(migration).toContain("alter table public.focus_goals enable row level security");
    expect(migration).toContain("alter table public.focus_routines enable row level security");
    expect(migration).toContain("using (auth.uid() = user_id)");
    expect(migration).toContain("with check (auth.uid() = user_id)");
  });

  it("grants sync table access only to authenticated users, not anon", () => {
    expect(migration).toContain("grant select, insert, update, delete on public.focus_sessions to authenticated");
    expect(migration).toContain("grant select, insert, update, delete on public.focus_goals to authenticated");
    expect(migration).toContain("grant select, insert, update, delete on public.focus_routines to authenticated");
    expect(migration).not.toContain(" to anon");
  });
});
