insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true)
on conflict (id) do nothing;

create policy "avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "users can delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "property photos are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'property-photos');

create policy "owners and admins can upload property photos"
  on storage.objects for insert
  with check (
    bucket_id = 'property-photos'
    and (
      public.is_admin(auth.uid())
      or exists (
        select 1 from public.properties
        where properties.id::text = (storage.foldername(name))[1]
          and properties.owner_id = auth.uid()
      )
    )
  );

create policy "owners and admins can delete property photos from storage"
  on storage.objects for delete
  using (
    bucket_id = 'property-photos'
    and (
      public.is_admin(auth.uid())
      or exists (
        select 1 from public.properties
        where properties.id::text = (storage.foldername(name))[1]
          and properties.owner_id = auth.uid()
      )
    )
  );
