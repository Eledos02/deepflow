do $$
begin
  if to_regprocedure('public.handle_new_auth_user()') is not null then
    execute 'alter function public.handle_new_auth_user() set search_path = public, pg_temp';
    execute 'revoke execute on function public.handle_new_auth_user() from public';
    execute 'revoke execute on function public.handle_new_auth_user() from anon';
    execute 'revoke execute on function public.handle_new_auth_user() from authenticated';
  end if;

  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'alter function public.rls_auto_enable() set search_path = public, pg_temp';
    execute 'revoke execute on function public.rls_auto_enable() from public';
    execute 'revoke execute on function public.rls_auto_enable() from anon';
    execute 'revoke execute on function public.rls_auto_enable() from authenticated';
  end if;

  if to_regprocedure('public.set_waitlist_updated_at()') is not null then
    execute 'alter function public.set_waitlist_updated_at() set search_path = public, pg_temp';
    execute 'revoke execute on function public.set_waitlist_updated_at() from public';
    execute 'revoke execute on function public.set_waitlist_updated_at() from anon';
    execute 'revoke execute on function public.set_waitlist_updated_at() from authenticated';
  end if;
end $$;
