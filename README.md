# Soundforge

Soundforge is a Next.js music-discovery app for independent artists and listeners. Browse and search tracks, stream with a shared player, upload original MP3s, save favorites, and organize playlists. Supabase provides authentication, database access, and audio storage.

## Run locally

```powershell
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. To check a production build, run `npm.cmd run build`; to serve that build, run `npm.cmd run start`.

## Pages

- `/` and `/explore` — public catalog, search, genre filters, likes, and playback.
- `/create` — authenticated MP3 publishing form for artists.
- `/library` — liked tracks and personal playlists.
- `/profile` — artist profile editor backed by Supabase.
- `/auth` — email/password sign-up and sign-in.
- `/settings/supabase` — Supabase connection setup and health check.

## Music catalog setup

Run `supabase/migrations/20261116000000_music_catalog.sql` in the Supabase SQL Editor after configuring the project credentials. This creates the public catalog, private likes/playlists, and a public `music-catalog` Storage bucket. Then sign in, open **Upload music**, choose an MP3 (up to 20 MB), and confirm that you have the rights to publish it. Public-bucket audio can be streamed by anyone with its URL; only upload recordings you have permission to share. Storage and bandwidth may incur Supabase/hosting costs.

Artist profiles require the `supabase/migrations/20260601000000_artist_profiles_and_avatars.sql` migration. The profile editor can prefill the artist name and photo from Google account metadata; Google does not provide a bio, genres, location, or website, so add those details and choose **Save artist profile**. Profile fields are stored in `public.artist_profiles` with row-level security. Uploaded avatars are saved in the private `artist-avatars` bucket with per-user Storage policies and signed preview URLs.

Existing Google accounts are not automatically populated in `artist_profiles` by the signup trigger. Once the migration is applied, the profile editor can load the Google name/photo as defaults; enter a handle and any other details, then save them. To store the avatar in the private bucket, use **Upload image** and then save the profile.

Supabase connection setup is at `/settings/supabase`. Copy `.env.example` to `.env.local`, set a matching Project URL and Publishable key (or legacy anon key) from the same Supabase project, restart the dev server, and use **Check Supabase connection**. Then run `supabase/migrations/20260601000000_artist_profiles_and_avatars.sql` in the Supabase SQL Editor. In Authentication → URL Configuration, allow `http://localhost:3000/auth/callback` during local development and the corresponding deployed callback in production. Keep secret/service-role keys out of client-visible variables and source control.

For a deployed site, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the hosting provider's project environment-variable settings, then rebuild/redeploy the site. A local `.env.local` file is not pushed to GitHub and does not configure a deployment. In Supabase Authentication → URL Configuration, set the production site URL and allow the deployed `/auth/callback` URL. Use only a publishable key (or legacy anon key), never a secret or service-role key.

Google and Gmail sign-in use Supabase's Google OAuth provider (the same provider supports both Google Workspace and Gmail accounts). To enable it, create a Google OAuth client in Google Cloud Console, add the Supabase callback URL shown in Supabase Authentication → Providers → Google to the Google client's authorized redirect URIs, then enable Google and enter its client ID and secret in Supabase. In Supabase Authentication → URL Configuration, set the site URL and allow each app callback URL, including `http://localhost:3000/auth/callback` and your deployed `/auth/callback`. The app redirects back through this route to establish the session; no Google client secret belongs in this repository or `.env.local`.

The connection check verifies the Supabase Auth health endpoint using the configured publishable/anon key. A successful check confirms that Auth is reachable; it does not verify database access. Apply the migration and test profile operations to enable artist data. Service-role/secret keys must never be placed in a `NEXT_PUBLIC_` variable. A service-role key was previously entered there; rotate it in Supabase if that has not already been done.

Run `npm.cmd run typecheck` to check TypeScript. No separate lint or automated test runner is configured yet.
