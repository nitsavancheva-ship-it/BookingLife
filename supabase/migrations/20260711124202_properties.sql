create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  city text not null,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  price_per_night numeric(10,2) not null check (price_per_night > 0),
  max_guests int not null default 1 check (max_guests > 0),
  bedrooms int not null default 1,
  bathrooms int not null default 1,
  amenities text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index properties_city_idx on public.properties (city);
create index properties_owner_id_idx on public.properties (owner_id);
create index properties_price_idx on public.properties (price_per_night);

alter table public.properties enable row level security;

create policy "properties are viewable by everyone"
  on public.properties for select
  using (true);

create policy "active users can insert own properties"
  on public.properties for insert
  with check (auth.uid() = owner_id and public.is_active_user(auth.uid()));

create policy "owners and admins can update properties"
  on public.properties for update
  using (auth.uid() = owner_id or public.is_admin(auth.uid()));

create policy "owners and admins can delete properties"
  on public.properties for delete
  using (auth.uid() = owner_id or public.is_admin(auth.uid()));

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger properties_set_updated_at
  before update on public.properties
  for each row execute procedure public.set_updated_at();
