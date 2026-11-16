create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  artist_name text not null check (char_length(artist_name) between 1 and 80),
  genre text not null check (char_length(genre) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  audio_path text not null unique,
  duration_seconds integer not null check (duration_seconds between 1 and 3600),
  rights_confirmed_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint music_tracks_audio_path_owner
    check (split_part(audio_path, '/', 1) = user_id::text)
);

create index if not exists music_tracks_created
  on public.music_tracks (created_at desc);
create index if not exists music_tracks_genre_created
  on public.music_tracks (genre, created_at desc);

alter table public.music_tracks enable row level security;

drop policy if exists "Anyone can discover published music" on public.music_tracks;
create policy "Anyone can discover published music"
  on public.music_tracks for select to anon, authenticated
  using (true);

drop policy if exists "Artists can publish music they have rights to" on public.music_tracks;
create policy "Artists can publish music they have rights to"
  on public.music_tracks for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and rights_confirmed_at is not null
  );

drop policy if exists "Artists can manage their published music" on public.music_tracks;
create policy "Artists can manage their published music"
  on public.music_tracks for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.music_tracks to anon, authenticated;
grant insert, delete on public.music_tracks to authenticated;

create table if not exists public.music_track_likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  track_id uuid not null references public.music_tracks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

alter table public.music_track_likes enable row level security;

drop policy if exists "Listeners can read their own likes" on public.music_track_likes;
create policy "Listeners can read their own likes"
  on public.music_track_likes for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Listeners can like tracks" on public.music_track_likes;
create policy "Listeners can like tracks"
  on public.music_track_likes for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Listeners can remove their likes" on public.music_track_likes;
create policy "Listeners can remove their likes"
  on public.music_track_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.music_track_likes to authenticated;

create table if not exists public.music_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  created_at timestamptz not null default now()
);

alter table public.music_playlists enable row level security;

drop policy if exists "Listeners can manage their playlists" on public.music_playlists;
create policy "Listeners can manage their playlists"
  on public.music_playlists for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.music_playlists to authenticated;

create table if not exists public.music_playlist_tracks (
  playlist_id uuid not null references public.music_playlists (id) on delete cascade,
  track_id uuid not null references public.music_tracks (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (playlist_id, track_id)
);

alter table public.music_playlist_tracks enable row level security;

drop policy if exists "Listeners can view their playlist tracks" on public.music_playlist_tracks;
create policy "Listeners can view their playlist tracks"
  on public.music_playlist_tracks for select to authenticated
  using (
    exists (
      select 1 from public.music_playlists
      where music_playlists.id = playlist_id
        and music_playlists.user_id = (select auth.uid())
    )
  );

drop policy if exists "Listeners can add tracks to their playlists" on public.music_playlist_tracks;
create policy "Listeners can add tracks to their playlists"
  on public.music_playlist_tracks for insert to authenticated
  with check (
    exists (
      select 1 from public.music_playlists
      where music_playlists.id = playlist_id
        and music_playlists.user_id = (select auth.uid())
    )
  );

drop policy if exists "Listeners can remove tracks from their playlists" on public.music_playlist_tracks;
create policy "Listeners can remove tracks from their playlists"
  on public.music_playlist_tracks for delete to authenticated
  using (
    exists (
      select 1 from public.music_playlists
      where music_playlists.id = playlist_id
        and music_playlists.user_id = (select auth.uid())
    )
  );

grant select, insert, delete on public.music_playlist_tracks to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'music-catalog',
  'music-catalog',
  true,
  20971520,
  array['audio/mpeg']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can stream catalog audio" on storage.objects;
create policy "Anyone can stream catalog audio"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'music-catalog');

drop policy if exists "Artists can upload their catalog audio" on storage.objects;
create policy "Artists can upload their catalog audio"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'music-catalog'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Artists can delete their catalog audio" on storage.objects;
create policy "Artists can delete their catalog audio"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'music-catalog'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
