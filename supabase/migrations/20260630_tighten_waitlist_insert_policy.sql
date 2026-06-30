alter table public.waitlist enable row level security;

revoke all on table public.waitlist from anon;
revoke all on table public.waitlist from authenticated;

grant insert (email, source, plan) on table public.waitlist to anon;
grant insert (email, source, plan) on table public.waitlist to authenticated;

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'waitlist'
  loop
    execute format('drop policy if exists %I on public.waitlist', policy_name);
  end loop;
end $$;

create policy "Public waitlist insert validated fields"
  on public.waitlist for insert
  to anon, authenticated
  with check (
    email is not null
    and email = btrim(email)
    and length(email) between 3 and 320
    and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    and source in (
      'pricing',
      'pricing_founding_member',
      'homepage_hero',
      'homepage_final_cta',
      'workspace_upgrade',
      'guides_cta',
      'unknown'
    )
    and plan = 'founding_member'
  );
