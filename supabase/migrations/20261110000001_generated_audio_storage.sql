insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'music-audio',
  'music-audio',
  false,
  10485760,
  array['audio/mpeg']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Artists can read their own generated audio" on storage.objects;
create policy "Artists can read their own generated audio"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'music-audio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Artists can upload their own generated audio" on storage.objects;
create policy "Artists can upload their own generated audio"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'music-audio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Artists can delete their own generated audio" on storage.objects;
create policy "Artists can delete their own generated audio"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'music-audio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
