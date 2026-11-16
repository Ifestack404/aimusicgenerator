# Soundforge — Project status

**Status:** Repositioned as an independent music discovery and sharing app. AI music generation has been removed from the active product flow. The catalog depends on the new Supabase migration being applied.

## Current experience

- Public catalog at `/` and `/explore` with track search and genre filters.
- Persistent site-wide audio player with play/pause, previous/next, and playlist queue behavior.
- Signed-in listeners can like tracks and create playlists at `/library`.
- Signed-in artists can publish MP3 tracks from `/create`.
- Uploads require an explicit rights confirmation. Public catalog audio is streamable by anyone.
- Existing Supabase authentication, artist profiles, and theme toggle remain.

## Database setup

Run `supabase/migrations/20261116000000_music_catalog.sql` in the configured Supabase project's SQL Editor. It creates:

- Public `music_tracks` catalog with row-level security.
- Private per-user likes, playlists, and playlist membership.
- Public `music-catalog` MP3 storage with owner-scoped upload and delete policies.

Track uploads require the migration, an authenticated account, and a valid MP3 under 20 MB. Public audio URLs are accessible to anyone; do not upload content without distribution rights. Audio storage and bandwidth may incur costs.

## Known limitations

- The catalog starts empty and has no built-in licensed music.
- Uploaded artist names are user-submitted; artist verification and moderation are not implemented.
- Audio is publicly readable from the catalog bucket. Takedown/reporting and abuse moderation are not implemented.
- Playlists and likes require the catalog migration; Supabase Auth and Storage must be configured.
- The legacy private project/album tables and old studio source remain in the repository but are no longer part of the active discovery, upload, or library routes.
- No billing, rights-management, or automated content-moderation workflow is implemented.

## Validation

- Run `npm.cmd run typecheck` and `npm.cmd run build`.
- Apply the catalog migration, then verify anonymous catalog reads, authenticated upload, playback, likes, and playlist creation against the configured Supabase project.
- No automated integration test suite is configured.
