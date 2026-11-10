create table if not exists public.music_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  mode text not null check (mode in ('text', 'lyrics', 'instrumental', 'custom')),
  prompt text not null default '' check (char_length(prompt) <= 5000),
  lyrics text not null default '' check (char_length(lyrics) <= 20000),
  genre text not null default '' check (char_length(genre) <= 80),
  mood text not null default '' check (char_length(mood) <= 80),
  vocal text not null default '' check (char_length(vocal) <= 40),
  duration_seconds integer not null default 60 check (duration_seconds between 1 and 3600),
  status text not null default 'draft' check (status in ('draft', 'queued', 'generated', 'failed')),
  audio_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint music_projects_id_user_unique unique (id, user_id)
);

create table if not exists public.music_albums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  cover_path text,
  release_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint music_albums_id_user_unique unique (id, user_id)
);

create table if not exists public.music_album_tracks (
  album_id uuid not null,
  project_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  track_number integer not null check (track_number > 0),
  added_at timestamptz not null default now(),
  primary key (album_id, project_id),
  constraint music_album_tracks_album_owner
    foreign key (album_id, user_id)
    references public.music_albums (id, user_id)
    on delete cascade,
  constraint music_album_tracks_project_owner
    foreign key (project_id, user_id)
    references public.music_projects (id, user_id)
    on delete cascade
);

create unique index if not exists music_album_tracks_number_unique
  on public.music_album_tracks (album_id, track_number);
create index if not exists music_projects_owner_created
  on public.music_projects (user_id, created_at desc);
create index if not exists music_albums_owner_created
  on public.music_albums (user_id, created_at desc);

alter table public.music_projects enable row level security;
alter table public.music_albums enable row level security;
alter table public.music_album_tracks enable row level security;

drop policy if exists "Artists can manage their music projects" on public.music_projects;
create policy "Artists can manage their music projects"
  on public.music_projects for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Artists can manage their music albums" on public.music_albums;
create policy "Artists can manage their music albums"
  on public.music_albums for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Artists can manage their album track lists" on public.music_album_tracks;
create policy "Artists can manage their album track lists"
  on public.music_album_tracks for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.music_projects to authenticated;
grant select, insert, update, delete on public.music_albums to authenticated;
grant select, insert, update, delete on public.music_album_tracks to authenticated;
