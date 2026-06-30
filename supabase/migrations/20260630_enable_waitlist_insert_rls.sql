alter table public.waitlist enable row level security;

revoke all on table public.waitlist from anon;
revoke all on table public.waitlist from authenticated;

grant insert (email, source, plan) on table public.waitlist to anon;
grant insert (email, source, plan) on table public.waitlist to authenticated;

drop policy if exists "Anyone can join the public waitlist" on public.waitlist;
create policy "Anyone can join the public waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (
    email is not null
    and plan = 'founding_member'
  );
