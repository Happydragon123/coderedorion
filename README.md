# Campus Food Rescue

Agent 0 foundation for the [build plan](campus-food-rescue-handoffs.md). Next.js App Router, TypeScript, Supabase cookie sessions, Zod contracts, and Leaflet dependencies. Food lifecycle/AI/voice APIs and interfaces remain assigned to feature owners. Contracts are provisional pending Agent 1 review; see [docs/contracts.md](docs/contracts.md).

## Run locally

Use Node 22+ and npm. The lockfile is the shared dependency baseline.

```sh
npm ci
cp .env.example .env.local # only if .env.local does not already exist
npm run dev
```

Open http://localhost:3000. `.env.local` has been created with blank values and is ignored by Git. Fill it locally; never commit keys. Restart the dev server after changing environment variables.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
# or all validation steps:
npm run check
```

## Configuration and authentication

Required for sign-in: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the shared project's API settings. Supabase Email/password authentication must be enabled and a confirmed test user created (dashboard or approved signup flow). Set Auth Site URL to your origin, allow `http://localhost:3000/auth/callback` and the deployed `/auth/callback` URL. Password sign-in is implemented; account creation/reset and OAuth UI are outside this foundation. Callback code exchange is ready for future PKCE flows.

With blank Supabase configuration, the shell boots and displays the exact missing variable names; sign-in is disabled and private routes redirect to sign-in. There is no mock authentication or service-role bypass. Browser/server use the public key with user session cookies. Proxy refreshes cookies; protected pages and APIs must independently verify the user. Enable and test RLS when Agent 1 provisions the database. Never expose a service-role key.

`GEMINI_API_KEY`, `GEMINI_MODEL`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_TTS_MODEL`, and `ELEVENLABS_STT_MODEL` are intentionally blank. Feature owners must verify models and account capabilities rather than assuming IDs. Only API keys are insufficient for voice: a voice ID and supported STT/TTS models are also required. These integrations are not yet implemented.

## Maps

Leaflet 1.9 + React Leaflet 5 selected for provider-independent raster tiles. Agent 2 imports `leaflet/dist/leaflet.css` and loads map components client-side with SSR disabled. Both `NEXT_PUBLIC_MAP_TILE_URL` (`{z}/{x}/{y}` template) and `NEXT_PUBLIC_MAP_ATTRIBUTION` are needed before enabling tiles. No default provider or fabricated campus coordinates. Choose an authorized provider, verify its plan/domain restrictions, attribution and browser caching requirements; keys in public tile URLs are public and should be domain-restricted. Keep list view usable when tiles are unavailable.

Public OSM tiles require visible attribution, appropriate caching, and prohibit bulk/offline prefetch; they are not an unlimited production backend. Sources: [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/), [React Leaflet setup](https://react-leaflet.js.org/docs/start-installation/). External directions/manual landmarks can ship before maps.

## Deployment

Deploy this repository as a Next.js project to Vercel or another Node-compatible Next.js host. Use `npm ci`, build `npm run build`; self-host with `npm start` and platform-provided PORT. Use Node 22+. Add environment variables in host settings (public variables are embedded at build time), set Supabase Site URL/redirect allowlist for the final HTTPS origin, rebuild, and check `/` and `/api/health`. Health reports process liveness and whether auth variables are present, not credential validity/database readiness. Preview origins need separate callback allowlisting.

Do not apply migrations here: Agent 1 owns them. Deploying the foundation without secrets is supported, with protected routes locked. Live sign-in must be tested with configured Supabase. No deployment URL has been created; a hosting project/account is still needed.

## Team integration

Read [contracts and ownership](docs/contracts.md) before coding. Coordinate Agent 1 table/DTO/transaction review with Agent 0 before freezing. Use isolated branches/worktrees and focused commits. Do not change dependencies, contracts or global styles without coordination. `lib/api-client.ts` is the frontend adapter for every planned endpoint; fixtures are explicit synthetic development data and are never served by production. UI fixtures have test coordinates, not verified campus locations.

Auth/session pattern follows [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) and [Next.js Proxy](https://nextjs.org/docs/app/getting-started/proxy). No AI SDK added yet; owners can use server fetch or request a justified dependency.

Known pending work: database/RLS/storage, verified campus seeds, all feature endpoints, real provider verification, rate limiting, deployed smoke tests, two-account lifecycle/race tests. Sign-in cannot be verified until Supabase URL, publishable key, Email auth and confirmed test account are available.

## Dependency audit

Initial npm audit reports five high findings in the development-only eslint-config-next → fast-glob → micromatch → braces chain (deeply nested glob patterns). The published braces version is 3.0.3 with no patched release available at setup time. npm suggests downgrading Next lint config across major versions; that is not applied. Production dependency audit is checked separately. Revisit the lint chain when a compatible fix is published.

## Foundation verification

Verified locally: `npm run check` (lint, typecheck, 3 contract boundary tests, production build), `npm audit --omit=dev` (zero findings), production HTTP smoke checks (`/` and `/sign-in` 200 with explicit missing configuration, `/account` 307 to sign-in, `/api/health` 200 with auth_configured=false). Real Supabase sign-in and hosted deployment remain unverified pending project credentials/account configuration.
