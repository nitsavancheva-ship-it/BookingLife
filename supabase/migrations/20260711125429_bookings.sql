create extension if not exists btree_gist;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  guest_id uuid not null references auth.users(id) on delete cascade,
  check_in date not null,
  check_out date not null check (check_out > check_in),
  total_price numeric(10,2) not null check (total_price > 0),
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  exclude using gist (
    property_id with =,
    daterange(check_in, check_out) with &&
  ) where (status = 'confirmed')
);

create index bookings_property_id_idx on public.bookings (property_id);
create index bookings_guest_id_idx on public.bookings (guest_id);

alter table public.bookings enable row level security;

create policy "guests owners and admins can view bookings"
  on public.bookings for select
  using (
    auth.uid() = guest_id
    or public.is_admin(auth.uid())
    or exists (
      select 1 from public.properties
      where properties.id = property_id and properties.owner_id = auth.uid()
    )
  );

create policy "active users can create own bookings"
  on public.bookings for insert
  with check (auth.uid() = guest_id and public.is_active_user(auth.uid()));

create policy "guests owners and admins can update bookings"
  on public.bookings for update
  using (
    auth.uid() = guest_id
    or public.is_admin(auth.uid())
    or exists (
      select 1 from public.properties
      where properties.id = property_id and properties.owner_id = auth.uid()
    )
  );
