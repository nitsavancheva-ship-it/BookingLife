create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  guest_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index reviews_property_id_idx on public.reviews (property_id);
create index reviews_guest_id_idx on public.reviews (guest_id);

alter table public.reviews enable row level security;

create policy "reviews are viewable by everyone"
  on public.reviews for select
  using (true);

create policy "guests can review their completed bookings"
  on public.reviews for insert
  with check (
    auth.uid() = guest_id
    and exists (
      select 1 from public.bookings
      where bookings.id = booking_id
        and bookings.guest_id = auth.uid()
        and bookings.status = 'confirmed'
        and bookings.check_out < current_date
    )
  );

create policy "authors and admins can update reviews"
  on public.reviews for update
  using (auth.uid() = guest_id or public.is_admin(auth.uid()));

create policy "authors and admins can delete reviews"
  on public.reviews for delete
  using (auth.uid() = guest_id or public.is_admin(auth.uid()));
