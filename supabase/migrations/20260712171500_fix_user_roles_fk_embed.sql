-- Same PostgREST embed issue fixed in 20260711155824 for owner_id/guest_id:
-- user_roles.user_id still referenced auth.users, so the admin page's
-- profiles -> user_roles(role) embed had no FK path and returned 400.
-- Re-point it at public.profiles (every auth user has a profiles row,
-- and profiles.id cascades from auth.users, so delete semantics are
-- unchanged).
alter table public.user_roles
  drop constraint user_roles_user_id_fkey,
  add constraint user_roles_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;
