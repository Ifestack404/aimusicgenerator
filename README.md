# Soundforge AI

Soundforge AI is a Next.js App Router project for an AI music creation studio. Its visual direction pairs glassmorphism with a warm recording-studio atmosphere, restrained green accents, and tactile creative controls. Visitors can switch between light and dark themes; their choice is saved in browser storage. Supabase authentication, artist profiles, and a private song and album library are implemented. Signed-in users can generate songs with ElevenLabs Music, preview and download the audio, and save it to their library. The provider API key and database/storage migrations must be configured before generation can work. Payments are not connected.

## Run locally

```powershell
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. To check a production build, run `npm.cmd run build`; to serve that build, run `npm.cmd run start`.

## Pages and project structure

- `/` (`app/page.tsx`) — branded homepage and links into the studio, explore, and pricing pages.
- `/create` (`app/create/page.tsx`) — authenticated music studio for generating, previewing, downloading, and saving songs.
- `/library` (`app/library/page.tsx`) — private saved song projects and album organization.
- `/explore` (`app/explore/page.tsx`) — featured genres and illustrative tracks. A selected genre carries through to the create page.
- `/pricing` (`app/pricing/page.tsx`) — non-active pricing preview.
- `/profile` (`app/profile/page.tsx`) — artist profile editor backed by Supabase.
- `/auth` (`app/auth/page.tsx`) — email/password sign-up and sign-in.
- `/settings/supabase` (`app/settings/supabase/page.tsx`) — Supabase connection setup and health check.
- `app/layout.tsx` — shared app layout and page metadata.
- `app/globals.css` — global theme, responsive layout, and component styling.
- `components/site-shell.tsx` — shared responsive navigation and footer.
- `components/studio-home.tsx` — page content, creation form, and reusable UI sections.
- `components/artist-profile.tsx` — authenticated artist profile editor with Supabase table and private Storage persistence.
- `components/music-library.tsx` — private song project library, album creation, track organization, and deletion.
- `components/auth-form.tsx` — email/password sign-up and sign-in.
- `components/supabase-connection.tsx` — connection instructions and API reachability check.
- `lib/supabase/client.ts` / `lib/supabase/server.ts` — browser and request-scoped server clients.
- `proxy.ts` — Supabase session refresh and cookie forwarding for Next.js 16.
- `supabase/migrations/20260601000000_artist_profiles_and_avatars.sql` — artist profile table, RLS, signup profile trigger, and private avatar bucket/policies.
- `supabase/migrations/20261110000000_music_library_and_albums.sql` — private song project/lyrics and album tables with per-user RLS.
- `lib/supabase/config.ts` — validated project URL and publishable-key configuration.
- `app/api/supabase/status/route.ts` — server-side Supabase API connection check.
- `app/api/music/generate/route.ts` — authenticated server-side ElevenLabs Music API integration.
- `supabase/migrations/20261110000001_generated_audio_storage.sql` — private bucket and per-user policies for generated audio.
- `.env.example` — template for local Supabase credentials and the server-only music provider key; copy to `.env.local`.
- `lib/music-options.ts` — shared genre options for the explore and create pages.
- `tsconfig.json` — strict TypeScript configuration.
- `next-env.d.ts` — Next.js TypeScript declarations.
- `PROJECT_STATUS.md` — current progress, known limitations, and recommended next stage.

## Music generation setup

Run both `supabase/migrations/20261110000000_music_library_and_albums.sql` and `supabase/migrations/20261110000001_generated_audio_storage.sql` in the Supabase SQL Editor for the project configured in the app. Then set `ELEVENLABS_API_KEY` as a server-only environment variable in Vercel (never prefix it with `NEXT_PUBLIC_`) and redeploy. Signed-in users can generate songs from `/create`, preview or download the result, and find saved audio in `/library`.

Generation uses ElevenLabs Music v2.5 and paid provider credits. Review ElevenLabs pricing and configure a quota before generating. User-supplied lyrics are sent only in Lyrics to music mode. The API route allows up to five minutes for provider generation; the hosting plan must support that duration. Locally, add the key to `.env.local`.

If generation returns **402 Payment Required**, the request reached ElevenLabs but the account is not currently authorized to fulfill it. Check the ElevenLabs account plan, billing status, available credits, and access to Music v2.5. Vercel logs include the provider response for additional diagnostics; never share API keys or authorization headers.

Pricing is a non-active preview. Checkout and account billing are not connected.

Artist profiles require a signed-in account and the SQL migration below. The profile editor can prefill the artist name and photo from Google account metadata; Google does not provide a bio, genres, location, or website, so add those details and choose **Save artist profile**. Profile fields are stored in `public.artist_profiles` with row-level security. Uploaded avatars are saved in the private `artist-avatars` bucket with per-user Storage policies and signed preview URLs.

Existing Google accounts are not automatically populated in `artist_profiles` by the signup trigger. Once the migration is applied, the profile editor can load the Google name/photo as defaults; enter a handle and any other details, then save them. To store the avatar in the private bucket, use **Upload image** and then save the profile.

To save a song idea without generating audio, enter a title and prompt or lyrics on `/create`, then choose **Save idea**. On `/library`, create albums and use each saved project's album selector to organize tracks.

The homepage hero uses an open, layered soundscape waveform aligned with the hero copy instead of a boxed artwork card.

Supabase connection setup is at `/settings/supabase`. Copy `.env.example` to `.env.local`, set a matching Project URL and Publishable key (or legacy anon key) from the same Supabase project, restart the dev server, and use **Check Supabase connection**. Then run `supabase/migrations/20260601000000_artist_profiles_and_avatars.sql` in the Supabase SQL Editor. In Authentication → URL Configuration, allow `http://localhost:3000/auth/callback` during local development and the corresponding deployed callback in production. Keep secret/service-role keys out of client-visible variables and source control.

For a deployed site, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the hosting provider's project environment-variable settings, then rebuild/redeploy the site. A local `.env.local` file is not pushed to GitHub and does not configure a deployment. In Supabase Authentication → URL Configuration, set the production site URL and allow the deployed `/auth/callback` URL. Use only a publishable key (or legacy anon key), never a secret or service-role key.

Google and Gmail sign-in use Supabase's Google OAuth provider (the same provider supports both Google Workspace and Gmail accounts). To enable it, create a Google OAuth client in Google Cloud Console, add the Supabase callback URL shown in Supabase Authentication → Providers → Google to the Google client's authorized redirect URIs, then enable Google and enter its client ID and secret in Supabase. In Supabase Authentication → URL Configuration, set the site URL and allow each app callback URL, including `http://localhost:3000/auth/callback` and your deployed `/auth/callback`. The app redirects back through this route to establish the session; no Google client secret belongs in this repository or `.env.local`.

The connection check verifies the Supabase Auth health endpoint using the configured publishable/anon key. A successful check confirms that Auth is reachable; it does not verify database access. Apply the migration and test profile operations to enable artist data. Service-role/secret keys must never be placed in a `NEXT_PUBLIC_` variable. A service-role key was previously entered there; rotate it in Supabase if that has not already been done.

Run `npm.cmd run typecheck` to check TypeScript. No separate lint or automated test runner is configured yet.
