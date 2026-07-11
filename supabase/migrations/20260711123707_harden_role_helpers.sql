-- Close two authorization gaps found in review of the initial schema.

-- 1. PostgREST auto-exposes public-schema functions as /rest/v1/rpc/*
--    endpoints. Revoking anon execution stops signed-out callers from
--    probing arbitrary users' admin status. Authenticated keeps execute
--    because RLS policies evaluate these functions with the caller's
--    privileges.
revoke execute on function public.is_admin(uuid) from public, anon;
revoke execute on function public.is_active_user(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated, service_role;
grant execute on function public.is_active_user(uuid) to authenticated, service_role;

-- 2. The self-update policy on profiles covers every column, which would
--    let a deactivated user set is_active back to true themselves. Only
--    admins may change is_active.
create or replace function public.protect_is_active()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active is distinct from old.is_active
     and not public.is_admin(auth.uid()) then
    raise exception 'only admins can change is_active';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_is_active
  before update on public.profiles
  for each row execute procedure public.protect_is_active();
