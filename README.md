# Campus Food Rescue

Agent 0 foundation for the [build plan](campus-food-rescue-handoffs.md). Next.js App Router, TypeScript, Supabase cookie sessions, Zod contracts, and Leaflet dependencies. Agent 1 implemented database migrations, RLS, private photo storage, authenticated food APIs, and atomic lifecycle operations. Agent 2’s protected student feed, details, pickups and impact interface is integrated. Agent 3’s organizer posting, management and Gemini endpoints are integrated. Agent 0 and Agent 1 froze the reviewed contracts; see [docs/contracts.md](docs/contracts.md) and [database setup](docs/database.md).

## Run locally

Use Node 22+ and npm. The lockfile is the shared dependency baseline.

```sh
npm ci
cp .env.example .env.local # only if .env.local does not already exist
npm run dev
```

Open http://localhost:3000. `.env.local` is ignored by Git. Fill it locally; never commit keys. Restart the dev server after changing environment variables.

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

Set `GEMINI_API_KEY` and `GEMINI_MODEL` locally for server-side photo-assisted drafting and typed natural-language search. The environment template leaves both blank. A minimal server-side text-generation request has been verified against the saved local configuration; Agent 3 implements the draft and search endpoints; the student feed now connects natural-language search to the grounded endpoint. Verify the selected model and account capabilities in each environment rather than assuming IDs. Manual posting and standard filters remain usable without Gemini.

## Shared AI admission and interpretation cache

Apply Agent 1's AI reliability migration before enabling AI routes. Both endpoints share atomic admission under the authenticated Supabase session. Limits live in the administrator-owned `public.ai_runtime_config` singleton; clients cannot set budgets. No extra credentials or dependencies are needed. Defaults are 6 requests/minute and 100/day per user, 12/minute and 450/day per project, one concurrent request/user and two/project. These are application budgets, not guaranteed provider quotas; tune them below the selected model's actual project quota.

An administrator can inspect/change settings through the database dashboard or an owner connection:

```sql
SELECT * FROM public.ai_runtime_config WHERE singleton = true;
UPDATE public.ai_runtime_config
SET user_per_minute = 6, user_per_day = 100,
    project_per_minute = 12, project_per_day = 450,
    user_concurrency = 1, project_concurrency = 2,
    lease_seconds = 60, provider_cooldown_seconds = 3600,
    cache_ttl_seconds = 300, cache_max_entries = 1000
WHERE singleton = true;
```

Lease expiration recovers capacity after interrupted requests. Provider throttling starts a shared cooldown (one hour by default) rather than triggering automatic retries. AI rate-limit errors preserve `{error:{code,message}}` and include integer `Retry-After` seconds plus `X-AI-Rate-Limit-Source: app` or `provider`; the shared client exposes these as `ApiClientError.options`. AI admission fails closed when shared storage is unavailable. Manual posting and standard filters remain available.

Search caches validated filter interpretations for five minutes, with a maximum of 1,000 entries by default. It retrieves inventory under the current authenticated session on every request and builds summaries from those fresh rows. Cache identity accounts for query/context, model, policy and verified landmarks; relative-time queries need an explicit time-aware policy or bypass caching. Cache storage contains no listing responses, photo URLs, reservations or pickup codes. Do not clear provider cooldown just to retry an exhausted quota; restore access only after checking the provider quota/reset.

## Maps

For the current demo, the user selected maps disabled. Keep both tile settings blank; food lists, manual landmarks and external directions remain available. An authorized tile provider and attribution must be configured and verified before enabling maps.

Leaflet 1.9 + React Leaflet 5 selected for provider-independent raster tiles. Agent 2 imports `leaflet/dist/leaflet.css` and loads map components client-side with SSR disabled. Both `NEXT_PUBLIC_MAP_TILE_URL` (`{z}/{x}/{y}` template) and `NEXT_PUBLIC_MAP_ATTRIBUTION` are needed before enabling tiles. No default provider or fabricated campus coordinates. Choose an authorized provider, verify its plan/domain restrictions, attribution and browser caching requirements; keys in public tile URLs are public and should be domain-restricted. Keep list view usable when tiles are unavailable.

Public OSM tiles require visible attribution, appropriate caching, and prohibit bulk/offline prefetch; they are not an unlimited production backend. Sources: [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/), [React Leaflet setup](https://react-leaflet.js.org/docs/start-installation/). External directions/manual landmarks can ship before maps.

## Deployment

Deploy this repository as a Next.js project to Vercel or another Node-compatible Next.js host. Use `npm ci`, build `npm run build`; self-host with `npm start` and platform-provided PORT. Use Node 22+. Add environment variables in host settings (public variables are embedded at build time), set Supabase Site URL/redirect allowlist for the final HTTPS origin, rebuild, and check `/` and `/api/health`. Health reports process liveness and whether auth variables are present, not credential validity/database readiness. Preview origins need separate callback allowlisting.

Agent 1 owns migrations. Follow [database setup](docs/database.md) when preparing a new project. The configured disposable demo project has the migration and verified landmark available, and live sign-in has passed. The existing deployment is https://coderedorion.vercel.app. See [student integration verification](docs/student-integration.md) for remaining hosted checks.

AI routes declare a 60-second function maximum around the 45-second Gemini timeout; verify the deployed function settings. Read [search integration and rehearsal](docs/search-integration.md) for current evidence and limits.

## Team integration

Read [contracts and ownership](docs/contracts.md) before coding. The table/DTO/transaction review is complete; coordinate subsequent contract changes with Agent 0 and Agent 1. Use isolated branches/worktrees and focused commits. Do not change dependencies, contracts or global styles without coordination. `lib/api-client.ts` is the frontend adapter for every planned endpoint; fixtures are explicit synthetic development data and are never served by production. UI fixtures have test coordinates, not verified campus locations.

Auth/session pattern follows [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) and [Next.js Proxy](https://nextjs.org/docs/app/getting-started/proxy). No AI SDK added yet; owners can use server fetch or request a justified dependency.

Implemented: database/RLS/private storage migration, authenticated non-AI endpoints, atomic lifecycle RPCs, bounded image validation/reencoding, protected student interface, and opt-in database and cookie-authenticated HTTP tests. Hosted organizer/photo/search lifecycle and separate-session student search-to-pickup checks passed after switching to `gemini-3.5-flash-lite`; see [the verification report](docs/search-integration.md). AI drafts require manual entry of location, quantity, pickup instructions and deadline. Shared AI admission/cache migration, live storage acceptance and bounded hosted reliability checks passed. Hosted Chrome verification passed for all seven protected pages at 320/390/768px, native geolocation denial with manual selection, and the two-session publish/search/reserve/cancel/re-reserve/close/collect flow; see [demo readiness](components/organizer/DEMO_READINESS.md) for CSS fixes, browser coverage and simulated demo totals. Maps stay disabled by user choice; real provider verification remains outside this demo.

## Dependency audit

Initial npm audit reports five high findings in the development-only eslint-config-next → fast-glob → micromatch → braces chain (deeply nested glob patterns). The published braces version is 3.0.3 with no patched release available at setup time. npm suggests downgrading Next lint config across major versions; that is not applied. Production dependency audit is checked separately. Revisit the lint chain when a compatible fix is published.

## Foundation verification

`npm run check` covers lint, typecheck, contract/photo/geo/AI policy tests and production build. Live Supabase database lifecycle and local cookie-authenticated HTTP suites passed with the user-authorized disposable demo project. Safari verified reservation, stale-page 409, cancellation, privacy, narrow layouts, geolocation denial and map tile failure fallback. Default tests skip live suites. Full evidence, repeat commands and deployment limits are in [student integration verification](docs/student-integration.md).
