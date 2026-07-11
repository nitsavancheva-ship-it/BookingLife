create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin'))
);

-- Security-definer helper functions. These run with the privileges of their
-- owner (the migration role, which bypasses RLS), which is what lets a
-- policy on user_roles check "is this caller an admin?" by querying
-- user_roles itself without triggering infinite recursion through its own
-- RLS policies.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_roles.user_id = uid and role = 'admin'
  );
$$;

create or replace function public.is_active_user(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_active from public.profiles where id = uid), false);
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

create policy "profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "admins can update any profile"
  on public.profiles for update
  using (public.is_admin(auth.uid()));

create policy "users can view own role"
  on public.user_roles for select
  using (auth.uid() = user_id);

create policy "admins can view all roles"
  on public.user_roles for select
  using (public.is_admin(auth.uid()));

create policy "admins can update roles"
  on public.user_roles for update
  using (public.is_admin(auth.uid()));

-- Auto-create profile + role rows for every new auth user.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  insert into public.user_roles (user_id, role)
  values (new.id, 'user');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
