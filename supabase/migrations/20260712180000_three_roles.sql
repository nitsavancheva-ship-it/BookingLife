-- Three-role separation: guests (role 'user') browse, book, and review;
-- hosts (role 'host') list and manage properties; admins administer.
-- Previously any signed-in user could both book stays and host properties;
-- the constraint, trigger, and policy changes below split those abilities
-- by role, with no overlap.

-- Allow 'host' as a role. The original constraint was declared inline on
-- user_roles.role (check (role in ('user', 'admin'))), so Postgres
-- auto-named it user_roles_role_check.
alter table public.user_roles
  drop constraint user_roles_role_check;

alter table public.user_roles
  add constraint user_roles_role_check check (role in ('user', 'host', 'admin'));

-- Security-definer role lookup, mirroring is_admin/is_active_user: it lets
-- policies on properties/bookings ask "what role does this caller have?"
-- by querying user_roles without triggering that table's own RLS policies.
create or replace function public.get_role(uid uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.user_roles where user_id = uid;
$$;

-- Honor the role chosen at signup, restricted server-side: the client may
-- ask for 'host', anything else (including 'admin', which can never be
-- self-selected) falls back to 'user'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  insert into public.user_roles (user_id, role)
  values (new.id, case when new.raw_user_meta_data->>'role' = 'host' then 'host' else 'user' end);

  return new;
end;
$$;

-- Only active hosts (or admins) may list properties.
drop policy "active users can insert own properties" on public.properties;

create policy "active hosts can insert own properties"
  on public.properties for insert
  with check (
    auth.uid() = owner_id
    and public.is_active_user(auth.uid())
    and public.get_role(auth.uid()) in ('host', 'admin')
  );

-- Only active guests may book.
drop policy "active users can create own bookings" on public.bookings;

create policy "active guests can create own bookings"
  on public.bookings for insert
  with check (
    auth.uid() = guest_id
    and public.is_active_user(auth.uid())
    and public.get_role(auth.uid()) = 'user'
  );
