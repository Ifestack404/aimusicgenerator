create table if not exists public.artist_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  artist_name text not null default '' check (char_length(artist_name) <= 60),
  handle text check (
    handle is null or (
      char_length(handle) between 2 and 30
      and handle ~ '^[A-Za-z0-9._]+$'
    )
  ),
  bio text not null default '' check (char_length(bio) <= 280),
  location text not null default '' check (char_length(location) <= 60),
  genres text[] not null default '{}',
  website text not null default '' check (char_length(website) <= 200),
  social_handle text not null default '' check (char_length(social_handle) <= 60),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artist_profiles_avatar_path_owner check (
    avatar_path is null or split_part(avatar_path, '/', 1) = id::text
  )
);

create unique index if not exists artist_profiles_handle_unique
  on public.artist_profiles (lower(handle))
  where handle is not null;

alter table public.artist_profiles enable row level security;

drop policy if exists "Artists can read their own profile" on public.artist_profiles;
create policy "Artists can read their own profile"
  on public.artist_profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Artists can create their own profile" on public.artist_profiles;
create policy "Artists can create their own profile"
  on public.artist_profiles for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Artists can update their own profile" on public.artist_profiles;
create policy "Artists can update their own profile"
  on public.artist_profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.set_artist_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists artist_profiles_updated_at on public.artist_profiles;
create trigger artist_profiles_updated_at
  before update on public.artist_profiles
  for each row execute function public.set_artist_profile_updated_at();

create or replace function public.create_artist_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.artist_profiles (id, artist_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 60)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_artist_profile_after_signup on auth.users;
create trigger create_artist_profile_after_signup
  after insert on auth.users
  for each row execute function public.create_artist_profile_for_new_user();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'artist-avatars',
  'artist-avatars',
  false,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Artists can read their own avatars" on storage.objects;
create policy "Artists can read their own avatars"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'artist-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Artists can upload their own avatars" on storage.objects;
create policy "Artists can upload their own avatars"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'artist-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Artists can update their own avatars" on storage.objects;
create policy "Artists can update their own avatars"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'artist-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'artist-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Artists can delete their own avatars" on storage.objects;
create policy "Artists can delete their own avatars"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'artist-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
