# Soundforge AI — Project status

**Status:** Responsive music platform with Supabase Auth, artist profiles, and a private song/album library. ElevenLabs Music API integration is implemented; it requires `ELEVENLABS_API_KEY` in Vercel and the generated-audio storage migration before deployed generation can work.

## Completed in this stage

- Preserved the Soundforge name, dark palette, lime accent, and “Your next idea starts here” tagline.
- Built a responsive home page with hero, navigation, route previews, product steps, and a shared footer.
- Added working creation mode tabs, genre and mood selection, vocal preference, duration, prompt character count, advanced settings, mobile navigation, and empty-prompt validation.
- Added authenticated ElevenLabs Music v2.5 song generation, private audio saving, playback, and download controls.
- Added email/password and Google sign-in with Supabase; checkout remains unavailable.
- Converted the app to strict TypeScript and added a `typecheck` script.
- Split the single long homepage into dedicated home, create, explore, and pricing routes.
- Added a shared responsive header and footer with active-route navigation and Next.js client-side links.
- Preserved a selected genre when navigating from Explore to Create.
- Added an artist profile page with editable avatar, display name, handle, bio, location, genres, website, and social handle.
- Saved artist profile data to Supabase with input validation, private avatar upload, clear feedback, and a live profile preview.
- Replaced the boxed hero artwork with an open, layered soundscape waveform aligned to the headline, with responsive sizing and light/dark theme colors.
- Refined the shared visual style with dark glassmorphism, translucent blurred surfaces, soft studio lighting, and consistent controls and cards across the home, creation, explore, pricing, profile, and account experiences while preserving existing behavior.
- Added a shared light/dark theme toggle; dark remains the default and the selected theme is persisted in browser local storage.
- Installed Supabase JS and SSR packages and added validated project config, a browser client, a protected connection-status API route, and setup instructions.
- Added `/settings/supabase` so project reachability can be checked before adding authentication or artist tables.
- Added email/password sign-up and sign-in at `/auth`, email-confirmation callback handling, shared sign-out controls, and Next.js 16 session refresh via `proxy.ts`.
- Added Google OAuth sign-in/sign-up via Supabase, with a shared callback/session exchange for Gmail and Google accounts.
- Added a request-scoped Supabase server client that reads and writes session cookies.
- Replaced local-only profile saving with authenticated Supabase profile fetch/upsert, handle conflict feedback, private avatar upload, and signed avatar previews.
- Added an idempotent SQL migration for `artist_profiles`, per-user RLS, new-user profile creation, private avatar storage, size/type limits, and ownership policies.
- Added a private song-project, album, and album-track schema with per-user RLS, plus a library UI for saving prompt/lyric ideas and organizing them into albums.
- Added an authenticated server route for ElevenLabs Music v2.5 generation, lyric-to-song composition plans, private audio upload and persistence, library playback, and download controls.
- Sanitized `.env.example` so it contains placeholders only.

## Files changed or added

- `app/page.tsx` — home page.
- `app/create/page.tsx` — music creation studio.
- `app/explore/page.tsx` — featured styles and illustrative tracks.
- `app/pricing/page.tsx` — non-active pricing preview.
- `app/profile/page.tsx` — artist identity and profile editor.
- `app/library/page.tsx` — private saved song projects and album organization.
- `app/api/music/generate/route.ts` — authenticated server-side ElevenLabs Music API integration.
- `app/settings/supabase/page.tsx` — Supabase setup and connection-status page.
- `app/auth/page.tsx`, `app/auth/callback/route.ts` — account page and email-confirmation callback.
- `app/api/supabase/status/route.ts` — server-side Supabase API reachability check.
- `app/layout.tsx` — shared application shell and default metadata.
- `app/globals.css` — visual system, responsive styles, reduced-motion handling, and hero animation.
- `components/site-shell.tsx` — shared route-aware navigation and footer.
- `components/artist-profile.tsx` — authenticated Supabase artist profile, private avatar storage, validation, and preview.
- `components/music-library.tsx` — saved song project list, album creation, track assignment, and deletion.
- `components/auth-form.tsx` — sign-up/sign-in form.
- `app/auth/callback/route.ts` — handles email confirmation and Google OAuth callback/session exchange.
- `components/supabase-connection.tsx` — connection setup instructions and status feedback.
- `components/studio-home.tsx` — page content, interactive form, and reusable sections.
- `lib/music-options.ts` — shared genre choices for the Explore and Create routes.
- `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/config.ts`, and `proxy.ts` — browser/server clients, cookie-based session refresh, and safe environment configuration.
- `supabase/migrations/20260601000000_artist_profiles_and_avatars.sql` — database, RLS, trigger, and avatar bucket setup.
- `supabase/migrations/20261110000000_music_library_and_albums.sql` — private song project, album, and album-track tables with RLS.
- `supabase/migrations/20261110000001_generated_audio_storage.sql` — private generated-audio bucket and per-user policies.
- `.env.example` and `.gitignore` — local environment template and secret-file exclusions.
- `tsconfig.json` — strict TypeScript configuration.
- `next-env.d.ts` — Next.js TypeScript declarations generated during the build.
- `package.json` / `package-lock.json` — TypeScript dependencies and typecheck script.
- `README.md` — project overview and local development instructions.

## Known limitations

- The ElevenLabs Music API key is not available in this repository. Add `ELEVENLABS_API_KEY` as a server-only Vercel variable; no generation request can succeed until configured.
- The music-library and generated-audio migrations must be applied to the Supabase project before saving generated songs or albums.
- Generation uses paid provider credits and may need Vercel function-duration support up to five minutes.
- Subscription checkout and production pricing are not implemented.
- A service-role key was previously entered in the public-key environment variable, then removed. Rotate it in Supabase if that has not already been done. The current public key successfully reaches Supabase Auth.
- The artist-profile migration was reported applied in Supabase; the music-library migration is separate and must also be applied before song projects/albums can be saved.
- Existing localStorage artist-profile data is not automatically imported into the signed-in Supabase profile.
- Configure the Supabase Auth redirect allowlist for `/auth/callback` on each environment before confirming email sign-ups.
- Google sign-in requires enabling the Google provider in Supabase and configuring a Google OAuth client; provider credentials have not been supplied or set up in the dashboards.
- No separate lint or automated test runner is configured.
- The current typefaces are loaded from Google Fonts, so the browser needs network access to fetch them; system sans-serif fallbacks are defined.

## Recommended next stage

Configure ElevenLabs pricing/quota and add its server-only API key in Vercel, apply both music-library/audio migrations, then test lyrics-to-song generation, private audio playback, library saving, and album organization. Keep billing disabled until real plan terms and checkout behavior are defined.

## Validation

- `npm.cmd run typecheck` — passed after the ElevenLabs integration.
- `npm.cmd run build` — passed after the ElevenLabs integration; all app routes compiled.
- Local HTTP checks — `/`, `/create`, `/create?genre=R%26B`, `/explore`, `/pricing`, and `/profile` each returned HTTP 200.
- Browser checks — required-field and website validation passed; a saved artist profile and selected genre persisted after reload; the mobile profile navigation opened and closed correctly; no horizontal overflow at 390px or 1440px.
- Hero animation checks — the note mark and all 31 waveform bars rendered; reduced-motion mode minimized animation to 0.01ms; no horizontal overflow at 390px or desktop width.
- Final `npm.cmd run typecheck` and `npm.cmd run build` — passed with all app routes included.
- Supabase status check returns `connected` (HTTP 200) after validating the Auth health endpoint with the current publishable key. This does not verify database profile/storage access; those require the migration and authenticated tests. Never put service-role/secret keys in `NEXT_PUBLIC_` variables.
- Lint and automated test runners — not configured in this project.
