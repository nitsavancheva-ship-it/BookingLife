-- PostgREST resolves embedded resources through foreign keys. owner_id and
-- guest_id originally referenced auth.users, which is not exposed through
-- the API, so joins like profiles:owner_id(display_name) had no FK path
-- and returned 400. Re-point the FKs at public.profiles: every auth user
-- has a profiles row (created by the signup trigger), and profiles.id
-- itself cascades from auth.users, so delete semantics are unchanged.
alter table public.properties
  drop constraint properties_owner_id_fkey,
  add constraint properties_owner_id_fkey
    foreign key (owner_id) references public.profiles(id) on delete cascade;

alter table public.bookings
  drop constraint bookings_guest_id_fkey,
  add constraint bookings_guest_id_fkey
    foreign key (guest_id) references public.profiles(id) on delete cascade;

alter table public.reviews
  drop constraint reviews_guest_id_fkey,
  add constraint reviews_guest_id_fkey
    foreign key (guest_id) references public.profiles(id) on delete cascade;
