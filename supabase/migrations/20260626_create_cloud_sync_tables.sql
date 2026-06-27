create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  title text,
  intention text,
  category text,
  duration_minutes integer not null check (duration_minutes > 0),
  completed_at timestamptz not null,
  source text default 'timer',
  routine_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, local_id)
);

create table if not exists public.focus_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  weekly_sessions_target integer check (weekly_sessions_target is null or weekly_sessions_target > 0),
  weekly_minutes_target integer check (weekly_minutes_target is null or weekly_minutes_target > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, local_id)
);

create table if not exists public.focus_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  name text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  intention text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, local_id)
);

create or replace function public.set_focus_sync_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists focus_sessions_set_updated_at on public.focus_sessions;
create trigger focus_sessions_set_updated_at
  before update on public.focus_sessions
  for each row execute procedure public.set_focus_sync_updated_at();

drop trigger if exists focus_goals_set_updated_at on public.focus_goals;
create trigger focus_goals_set_updated_at
  before update on public.focus_goals
  for each row execute procedure public.set_focus_sync_updated_at();

drop trigger if exists focus_routines_set_updated_at on public.focus_routines;
create trigger focus_routines_set_updated_at
  before update on public.focus_routines
  for each row execute procedure public.set_focus_sync_updated_at();

alter table public.focus_sessions enable row level security;
alter table public.focus_goals enable row level security;
alter table public.focus_routines enable row level security;

drop policy if exists "Users can select their own focus sessions" on public.focus_sessions;
create policy "Users can select their own focus sessions"
  on public.focus_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own focus sessions" on public.focus_sessions;
create policy "Users can insert their own focus sessions"
  on public.focus_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own focus sessions" on public.focus_sessions;
create policy "Users can update their own focus sessions"
  on public.focus_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own focus sessions" on public.focus_sessions;
create policy "Users can delete their own focus sessions"
  on public.focus_sessions for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can select their own focus goals" on public.focus_goals;
create policy "Users can select their own focus goals"
  on public.focus_goals for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own focus goals" on public.focus_goals;
create policy "Users can insert their own focus goals"
  on public.focus_goals for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own focus goals" on public.focus_goals;
create policy "Users can update their own focus goals"
  on public.focus_goals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own focus goals" on public.focus_goals;
create policy "Users can delete their own focus goals"
  on public.focus_goals for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can select their own focus routines" on public.focus_routines;
create policy "Users can select their own focus routines"
  on public.focus_routines for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own focus routines" on public.focus_routines;
create policy "Users can insert their own focus routines"
  on public.focus_routines for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own focus routines" on public.focus_routines;
create policy "Users can update their own focus routines"
  on public.focus_routines for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own focus routines" on public.focus_routines;
create policy "Users can delete their own focus routines"
  on public.focus_routines for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.focus_sessions to authenticated;
grant select, insert, update, delete on public.focus_goals to authenticated;
grant select, insert, update, delete on public.focus_routines to authenticated;
