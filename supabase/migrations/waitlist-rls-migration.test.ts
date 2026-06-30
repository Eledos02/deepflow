import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260630_enable_waitlist_insert_rls.sql"),
  "utf8",
);

describe("waitlist RLS migration", () => {
  it("keeps RLS enabled and allows public insert only", () => {
    expect(migration).toContain("alter table public.waitlist enable row level security");
    expect(migration).toContain("grant insert (email, source, plan) on table public.waitlist to anon");
    expect(migration).toContain("on public.waitlist for insert");
    expect(migration).toContain("to anon, authenticated");
    expect(migration).not.toContain("grant select");
    expect(migration).not.toContain("grant update");
    expect(migration).not.toContain("grant delete");
    expect(migration).not.toContain("for select");
    expect(migration).not.toContain("for update");
    expect(migration).not.toContain("for delete");
  });
});
