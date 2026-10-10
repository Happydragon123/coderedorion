# Campus Food Rescue

Agent 0 foundation for the [build plan](campus-food-rescue-handoffs.md). Next.js App Router, TypeScript, Supabase cookie sessions, Zod contracts, and Leaflet dependencies. Agent 1 implemented database migrations, RLS, private photo storage, authenticated food APIs, and atomic lifecycle operations. AI APIs and feature interfaces remain assigned to their owners. Agent 0 and Agent 1 froze the reviewed contracts; see [docs/contracts.md](docs/contracts.md) and [database setup](docs/database.md).

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

With blank Supabase configuration, the shell boots and displays the exact missing variable names; sign-in is disabled and private routes redirect to sign-in. There is no mock authentication or service-role bypass. Browser/server use the public key with user session cookies. Proxy refreshes cookies; protected pages and APIs must independently verify the user. Apply the reviewed migration and run its real database tests as described in [database setup](docs/database.md). Never expose a service-role key.

Set `GEMINI_API_KEY` and `GEMINI_MODEL` locally for server-side photo-assisted drafting and typed natural-language search. The environment template leaves both blank. A minimal server-side text-generation request has been verified against the saved local configuration; feature integrations still belong to Agent 3. Verify the selected model and account capabilities in each environment rather than assuming IDs. Manual posting and standard filters remain usable without Gemini.

## Maps

Leaflet 1.9 + React Leaflet 5 selected for provider-independent raster tiles. Agent 2 imports `leaflet/dist/leaflet.css` and loads map components client-side with SSR disabled. Both `NEXT_PUBLIC_MAP_TILE_URL` (`{z}/{x}/{y}` template) and `NEXT_PUBLIC_MAP_ATTRIBUTION` are needed before enabling tiles. No default provider or fabricated campus coordinates. Choose an authorized provider, verify its plan/domain restrictions, attribution and browser caching requirements; keys in public tile URLs are public and should be domain-restricted. Keep list view usable when tiles are unavailable.

Public OSM tiles require visible attribution, appropriate caching, and prohibit bulk/offline prefetch; they are not an unlimited production backend. Sources: [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/), [React Leaflet setup](https://react-leaflet.js.org/docs/start-installation/). External directions/manual landmarks can ship before maps.

## Deployment

Deploy this repository as a Next.js project to Vercel or another Node-compatible Next.js host. Use `npm ci`, build `npm run build`; self-host with `npm start` and platform-provided PORT. Use Node 22+. Add environment variables in host settings (public variables are embedded at build time), set Supabase Site URL/redirect allowlist for the final HTTPS origin, rebuild, and check `/` and `/api/health`. Health reports process liveness and whether auth variables are present, not credential validity/database readiness. Preview origins need separate callback allowlisting.

Agent 1 owns migrations. Follow [database setup](docs/database.md) to review and apply the migration once to the intended Supabase project; this handoff has not applied it remotely. Deploying the foundation without secrets is supported, with protected routes locked. Live sign-in must be tested with configured Supabase. No deployment URL has been created; a hosting project/account is still needed.

## Team integration

Read [contracts and ownership](docs/contracts.md) before coding. The table/DTO/transaction review is complete; coordinate subsequent contract changes with Agent 0 and Agent 1. Use isolated branches/worktrees and focused commits. Do not change dependencies, contracts or global styles without coordination. `lib/api-client.ts` is the frontend adapter for every planned endpoint; fixtures are explicit synthetic development data and are never served by production. UI fixtures have test coordinates, not verified campus locations.

Auth/session pattern follows [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) and [Next.js Proxy](https://nextjs.org/docs/app/getting-started/proxy). No AI SDK added yet; owners can use server fetch or request a justified dependency.

Implemented backend: database/RLS/private storage migration, authenticated non-AI endpoints, atomic lifecycle RPCs, bounded image validation/reencoding, and opt-in two-account lifecycle/race tests. Pending: applying the migration, verifying campus landmarks, running live database/storage and deployed HTTP smoke tests, feature interfaces, AI endpoints, real provider verification, and rate limiting. Sign-in cannot be verified until Supabase URL, publishable key, Email auth and confirmed test account are available.

## Dependency audit

Initial npm audit reports five high findings in the development-only eslint-config-next → fast-glob → micromatch → braces chain (deeply nested glob patterns). The published braces version is 3.0.3 with no patched release available at setup time. npm suggests downgrading Next lint config across major versions; that is not applied. Production dependency audit is checked separately. Revisit the lint chain when a compatible fix is published.

## Foundation verification

Verified locally: `npm run check` (lint, typecheck, 3 contract boundary tests, production build), `npm audit --omit=dev` (zero findings), production HTTP smoke checks (`/` and `/sign-in` 200 with explicit missing configuration, `/account` 307 to sign-in, `/api/health` 200 with auth_configured=false). Current backend validation: lint, typecheck, production build, and 5 local contract/photo tests pass; the real database lifecycle suite reports a skip without explicit disposable-project credentials. No migration was applied. Real Supabase sign-in, lifecycle/RLS/storage behavior, and hosted deployment remain unverified pending project/account setup; see [database verification](docs/database.md).
