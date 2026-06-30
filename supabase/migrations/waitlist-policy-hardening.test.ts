import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260630_tighten_waitlist_insert_policy.sql",
  ),
  "utf8",
);

describe("tightened waitlist insert policy", () => {
  it("replaces existing waitlist policies with one validated insert policy", () => {
    expect(migration).toContain("alter table public.waitlist enable row level security");
    expect(migration).toContain("from pg_policies");
    expect(migration).toContain("drop policy if exists %I on public.waitlist");
    expect(migration).toContain('create policy "Public waitlist insert validated fields"');
    expect(migration).toContain("on public.waitlist for insert");
    expect(migration).toContain("to anon, authenticated");
    expect(migration).not.toContain("for select");
    expect(migration).not.toContain("for update");
    expect(migration).not.toContain("for delete");
    expect(migration).not.toContain("with check (true)");
  });

  it("keeps public grants insert-only and column-scoped", () => {
    expect(migration).toContain("revoke all on table public.waitlist from anon");
    expect(migration).toContain("revoke all on table public.waitlist from authenticated");
    expect(migration).toContain("grant insert (email, source, plan) on table public.waitlist to anon");
    expect(migration).toContain("grant insert (email, source, plan) on table public.waitlist to authenticated");
    expect(migration).not.toContain("grant select");
    expect(migration).not.toContain("grant update");
    expect(migration).not.toContain("grant delete");
  });

  it("validates email, source, and plan without requiring read access", () => {
    expect(migration).toContain("email is not null");
    expect(migration).toContain("email = btrim(email)");
    expect(migration).toContain("length(email) between 3 and 320");
    expect(migration).toContain("email ~*");
    expect(migration).toContain("'pricing'");
    expect(migration).toContain("'pricing_founding_member'");
    expect(migration).toContain("'homepage_hero'");
    expect(migration).toContain("'homepage_final_cta'");
    expect(migration).toContain("'workspace_upgrade'");
    expect(migration).toContain("'guides_cta'");
    expect(migration).toContain("'unknown'");
    expect(migration).toContain("plan = 'founding_member'");
  });
});
