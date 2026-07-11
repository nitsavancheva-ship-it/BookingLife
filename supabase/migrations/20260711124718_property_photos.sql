create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null,
  display_order int not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create index property_photos_property_id_idx on public.property_photos (property_id);
create unique index property_photos_one_cover_per_property
  on public.property_photos (property_id)
  where is_cover;

alter table public.property_photos enable row level security;

create policy "property photos are viewable by everyone"
  on public.property_photos for select
  using (true);

create policy "owners and admins can insert property photos"
  on public.property_photos for insert
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.properties
      where properties.id = property_id and properties.owner_id = auth.uid()
    )
  );

create policy "owners and admins can update property photos"
  on public.property_photos for update
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.properties
      where properties.id = property_id and properties.owner_id = auth.uid()
    )
  );

create policy "owners and admins can delete property photos"
  on public.property_photos for delete
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.properties
      where properties.id = property_id and properties.owner_id = auth.uid()
    )
  );
