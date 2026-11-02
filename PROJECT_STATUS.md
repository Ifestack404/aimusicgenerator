# Soundforge AI — Project status

**Status:** Responsive multi-page prototype complete. Supabase Auth is verified reachable with the configured project URL and publishable key; the artist-profile database migration still needs to be applied.

## Completed in this stage

- Preserved the Soundforge name, dark palette, lime accent, and “Your next idea starts here” tagline.
- Built a responsive home page with hero, navigation, route previews, product steps, and a shared footer.
- Added working creation mode tabs, genre and mood selection, vocal preference, duration, prompt character count, advanced settings, mobile navigation, and empty-prompt validation.
- Added a simulated demo submission with loading feedback and an explicit message that no audio is generated or saved.
- Added audio playback controls that are ready for a real sample source; they remain disabled while the project has no audio files.
- Kept sign-in and checkout unavailable rather than presenting them as working services.
- Converted the app to strict TypeScript and added a `typecheck` script.
- Split the single long homepage into dedicated home, create, explore, and pricing routes.
- Added a shared responsive header and footer with active-route navigation and Next.js client-side links.
- Preserved a selected genre when navigating from Explore to Create.
- Added an artist profile page with editable avatar, display name, handle, bio, location, genres, website, and social handle.
- Saved profile data to browser local storage with input validation, upload limits, clear feedback, and a live profile preview.
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
- Sanitized `.env.example` so it contains placeholders only.

## Files changed or added

- `app/page.tsx` — home page.
- `app/create/page.tsx` — music creation studio.
- `app/explore/page.tsx` — featured styles and illustrative tracks.
- `app/pricing/page.tsx` — non-active pricing preview.
- `app/profile/page.tsx` — artist identity and profile editor.
- `app/settings/supabase/page.tsx` — Supabase setup and connection-status page.
- `app/auth/page.tsx`, `app/auth/callback/route.ts` — account page and email-confirmation callback.
- `app/api/supabase/status/route.ts` — server-side Supabase API reachability check.
- `app/layout.tsx` — shared application shell and default metadata.
- `app/globals.css` — visual system, responsive styles, reduced-motion handling, and hero animation.
- `components/site-shell.tsx` — shared route-aware navigation and footer.
- `components/artist-profile.tsx` — authenticated Supabase artist profile, private avatar storage, validation, and preview.
- `components/auth-form.tsx` — sign-up/sign-in form.
- `app/auth/callback/route.ts` — handles email confirmation and Google OAuth callback/session exchange.
- `components/supabase-connection.tsx` — connection setup instructions and status feedback.
- `components/studio-home.tsx` — page content, interactive form, and reusable sections.
- `lib/music-options.ts` — shared genre choices for the Explore and Create routes.
- `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/config.ts`, and `proxy.ts` — browser/server clients, cookie-based session refresh, and safe environment configuration.
- `supabase/migrations/20260601000000_artist_profiles_and_avatars.sql` — database, RLS, trigger, and avatar bucket setup.
- `.env.example` and `.gitignore` — local environment template and secret-file exclusions.
- `tsconfig.json` — strict TypeScript configuration.
- `next-env.d.ts` — Next.js TypeScript declarations generated during the build.
- `package.json` / `package-lock.json` — TypeScript dependencies and typecheck script.
- `README.md` — project overview and local development instructions.

## Known limitations

- No music-generation API or audio assets are present; demo tracks are illustrative artwork and metadata only.
- Saved creations, subscription checkout, and production pricing are not implemented.
- A service-role key was previously entered in the public-key environment variable, then removed. Rotate it in Supabase if that has not already been done. The current public key successfully reaches Supabase Auth.
- The Supabase migration has not yet been applied to the remote project. Until then, profile reads/writes and avatar uploads will report setup errors.
- Existing localStorage artist-profile data is not automatically imported into the signed-in Supabase profile.
- Configure the Supabase Auth redirect allowlist for `/auth/callback` on each environment before confirming email sign-ups.
- Google sign-in requires enabling the Google provider in Supabase and configuring a Google OAuth client; provider credentials have not been supplied or set up in the dashboards.
- No separate lint or automated test runner is configured.
- The current typefaces are loaded from Google Fonts, so the browser needs network access to fetch them; system sans-serif fallbacks are defined.

## Recommended next stage

Apply the included SQL migration in the Supabase SQL Editor, then test sign-up, email confirmation, sign-in/sign-out, profile edits, and avatar upload with a test account. The connection check verifies Auth reachability only; it does not verify database access. Decide whether to add an explicit local-profile import flow. After that, choose an authorized music-generation provider and add licensed sample audio; keep billing disabled until real plan terms and checkout behavior are defined.

## Validation

- `npm.cmd run typecheck` — passed before the final documentation and UI styling updates.
- `npm.cmd run build` — passed after updating Supabase status verification.
- Local HTTP checks — `/`, `/create`, `/create?genre=R%26B`, `/explore`, `/pricing`, and `/profile` each returned HTTP 200.
- Browser checks — required-field and website validation passed; a saved artist profile and selected genre persisted after reload; the mobile profile navigation opened and closed correctly; no horizontal overflow at 390px or 1440px.
- Hero animation checks — the note mark and all 31 waveform bars rendered; reduced-motion mode minimized animation to 0.01ms; no horizontal overflow at 390px or desktop width.
- Final `npm.cmd run typecheck` and `npm.cmd run build` — passed with all app routes included.
- Supabase status check returns `connected` (HTTP 200) after validating the Auth health endpoint with the current publishable key. This does not verify database profile/storage access; those require the migration and authenticated tests. Never put service-role/secret keys in `NEXT_PUBLIC_` variables.
- Lint and automated test runners — not configured in this project.
