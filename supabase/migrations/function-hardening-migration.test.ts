import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260630_harden_internal_function_permissions.sql",
  ),
  "utf8",
);

describe("internal function hardening migration", () => {
  it("sets explicit search_path on the flagged internal functions", () => {
    expect(migration).toContain("alter function public.handle_new_auth_user() set search_path = public, pg_temp");
    expect(migration).toContain("alter function public.rls_auto_enable() set search_path = public, pg_temp");
    expect(migration).toContain("alter function public.set_waitlist_updated_at() set search_path = public, pg_temp");
  });

  it("revokes direct public execution without dropping trigger functions", () => {
    for (const functionName of [
      "handle_new_auth_user",
      "rls_auto_enable",
      "set_waitlist_updated_at",
    ]) {
      expect(migration).toContain(`revoke execute on function public.${functionName}() from public`);
      expect(migration).toContain(`revoke execute on function public.${functionName}() from anon`);
      expect(migration).toContain(`revoke execute on function public.${functionName}() from authenticated`);
    }

    expect(migration).not.toContain("drop function public.handle_new_auth_user");
    expect(migration).not.toContain("drop function public.rls_auto_enable");
    expect(migration).not.toContain("drop function public.set_waitlist_updated_at");
    expect(migration).not.toContain("drop trigger");
  });

  it("guards remote-only functions so local migration history remains compatible", () => {
    expect(migration).toContain("to_regprocedure('public.handle_new_auth_user()')");
    expect(migration).toContain("to_regprocedure('public.rls_auto_enable()')");
    expect(migration).toContain("to_regprocedure('public.set_waitlist_updated_at()')");
  });
});
