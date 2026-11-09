# Soundforge AI

Soundforge AI is a Next.js App Router project for a premium AI music creation studio. Its visual direction pairs glassmorphism with a warm recording-studio atmosphere, restrained green accents, and tactile creative controls. Visitors can switch between light and dark themes; their choice is saved in browser storage. Its home, create, explore, and pricing sections are separate pages. The prototype does not connect to a music-generation service, payment provider, or audio library. Supabase authentication and artist-profile persistence are implemented; they need a valid project credential pair and the included database migration.

## Run locally

```powershell
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. To check a production build, run `npm.cmd run build`; to serve that build, run `npm.cmd run start`.

## Pages and project structure

- `/` (`app/page.tsx`) — branded homepage and links into the studio, explore, and pricing pages.
- `/create` (`app/create/page.tsx`) — interactive music-creation demo.
- `/explore` (`app/explore/page.tsx`) — featured genres and illustrative tracks. A selected genre carries through to the create page.
- `/pricing` (`app/pricing/page.tsx`) — non-active pricing preview.
- `/profile` (`app/profile/page.tsx`) — artist profile editor with browser-local persistence.
- `/auth` (`app/auth/page.tsx`) — email/password sign-up and sign-in.
- `/settings/supabase` (`app/settings/supabase/page.tsx`) — Supabase connection setup and health check.
- `app/layout.tsx` — shared app layout and page metadata.
- `app/globals.css` — global theme, responsive layout, and component styling.
- `components/site-shell.tsx` — shared responsive navigation and footer.
- `components/studio-home.tsx` — page content, creation form, and reusable UI sections.
- `components/artist-profile.tsx` — authenticated artist profile editor with Supabase table and private Storage persistence.
- `components/auth-form.tsx` — email/password sign-up and sign-in.
- `components/supabase-connection.tsx` — connection instructions and API reachability check.
- `lib/supabase/client.ts` / `lib/supabase/server.ts` — browser and request-scoped server clients.
- `proxy.ts` — Supabase session refresh and cookie forwarding for Next.js 16.
- `supabase/migrations/20260601000000_artist_profiles_and_avatars.sql` — artist profile table, RLS, signup profile trigger, and private avatar bucket/policies.
- `lib/supabase/config.ts` — validated project URL and publishable-key configuration.
- `app/api/supabase/status/route.ts` — server-side Supabase API connection check.
- `.env.example` — template for local Supabase credentials; copy to `.env.local`.
- `lib/music-options.ts` — shared genre options for the explore and create pages.
- `tsconfig.json` — strict TypeScript configuration.
- `next-env.d.ts` — Next.js TypeScript declarations.
- `PROJECT_STATUS.md` — current progress, known limitations, and recommended next stage.

## Current prototype behavior

The creation modes, genre and mood controls, vocal options, duration controls, prompt character count, advanced settings, mobile navigation, and form validation are interactive. Submitting a valid prompt runs a clearly labeled demo flow only; no audio is generated or saved. The featured track rows are illustrative and their play controls stay disabled because the project contains no audio samples.

Pricing is a non-active preview. Checkout and account billing are not connected.

Artist profiles require a signed-in account. Artist details are stored in `public.artist_profiles` with row-level security, and avatars are saved in the private `artist-avatars` bucket with per-user Storage policies and signed preview URLs. Existing browser-local profile data is not automatically imported.

The homepage hero uses an open, layered soundscape waveform aligned with the hero copy instead of a boxed artwork card.

Supabase connection setup is at `/settings/supabase`. Copy `.env.example` to `.env.local`, set a matching Project URL and Publishable key (or legacy anon key) from the same Supabase project, restart the dev server, and use **Check Supabase connection**. Then run `supabase/migrations/20260601000000_artist_profiles_and_avatars.sql` in the Supabase SQL Editor. In Authentication → URL Configuration, allow `http://localhost:3000/auth/callback` during local development and the corresponding deployed callback in production. Keep secret/service-role keys out of client-visible variables and source control.

For a deployed site, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the hosting provider's project environment-variable settings, then rebuild/redeploy the site. A local `.env.local` file is not pushed to GitHub and does not configure a deployment. In Supabase Authentication → URL Configuration, set the production site URL and allow the deployed `/auth/callback` URL. Use only a publishable key (or legacy anon key), never a secret or service-role key.

Google and Gmail sign-in use Supabase's Google OAuth provider (the same provider supports both Google Workspace and Gmail accounts). To enable it, create a Google OAuth client in Google Cloud Console, add the Supabase callback URL shown in Supabase Authentication → Providers → Google to the Google client's authorized redirect URIs, then enable Google and enter its client ID and secret in Supabase. In Supabase Authentication → URL Configuration, set the site URL and allow each app callback URL, including `http://localhost:3000/auth/callback` and your deployed `/auth/callback`. The app redirects back through this route to establish the session; no Google client secret belongs in this repository or `.env.local`.

The connection check verifies the Supabase Auth health endpoint using the configured publishable/anon key. A successful check confirms that Auth is reachable; it does not verify database access. Apply the migration and test profile operations to enable artist data. Service-role/secret keys must never be placed in a `NEXT_PUBLIC_` variable. A service-role key was previously entered there; rotate it in Supabase if that has not already been done.

Run `npm.cmd run typecheck` to check TypeScript. No separate lint or automated test runner is configured yet.
