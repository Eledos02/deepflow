create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'pricing',
  plan text not null default 'founding_member',
  created_at timestamptz not null default now(),
  constraint waitlist_email_key unique (email),
  constraint waitlist_plan_check check (plan = 'founding_member')
);

create index if not exists waitlist_created_at_idx on public.waitlist (created_at desc);
