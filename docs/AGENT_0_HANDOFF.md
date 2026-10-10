# Agent 0 session handoff — AI reliability and final demo readiness

Prepared 2026-10-10. Next owner: teammate Agent 3 for AI reliability, coordinating with Agent 1 for database migrations and Agent 0 for shared configuration/contracts. Agent 2 owns the remaining student/mobile/map checks.

## Start here

Read `AGENTS.md`, `README.md`, `docs/contracts.md`, `lib/contracts.ts`, and `campus-food-rescue-handoffs.md`. Read `docs/search-integration.md` for detailed verification evidence. Work from current `main` in a separate branch/worktree; preserve other agents' changes.

- Latest session commit before this handoff: `368036a` (verification documentation).
- Deployed runtime fix verified: `d580bf9` (manual operational fields in AI drafts).
- Hosted app: https://coderedorion.vercel.app
- Stack: Next.js App Router / TypeScript / npm / Supabase Auth, Postgres and Storage / server-side Gemini. ElevenLabs was removed intentionally; do not reintroduce it.
- Integrated student search: `3b2db95`, including Agent 3's verification ancestor `26c748c`. Organizer work and global Share food / Manage navigation are also integrated.
- User-owned `catered_food.webp` remains untracked. Do not add, delete or overwrite it. `.env.local` is private and must never be printed or committed.

## Current working behavior

Supabase auth, protected pages, endpoint authorization, manual posting, feed/filtering, one-portion reservation, private pickup history/cancellation, organizer close/collection and impact are implemented. Public results exclude pickup codes. Closing stops new reservations and preserves existing pickups until deadline. Collection is atomic and idempotent; only collected reservations increase impact.

The user set `GEMINI_MODEL=gemini-3.5-flash-lite` locally and in Vercel Production and redeployed. Both hosted AI endpoints returned HTTP 200 with valid contracts. Model identity is configured by the user; successful requests verify compatibility rather than independently exposing deployment environment values.

The prior 3.8 Flash quota was exhausted: the user's dashboard showed 22/20 daily requests. Their Flash-Lite dashboard showed 15 requests/minute, 250,000 input tokens/minute and 500 requests/day. These are project-specific observations, not guaranteed future limits. Keep model/quota assumptions configurable. Keys stay server-side with no `NEXT_PUBLIC_` prefix.

AI search interprets only allowlisted filters, then retrieves current inventory under the authenticated Supabase session. Summaries are deterministic and grounded in returned listing DTOs. Standard filters and manual posting remain available on AI failure. Search uses the shared `api.search` client and displays interpreted filters, grounded cards, loading/errors and a standard-results fallback.

The new model initially invented a valid campus location when the description explicitly said the landmark was unknown. `d580bf9` fixes this at the server policy boundary: AI draft location, quantity, pickup instructions and deadline always become null and require organizer entry. Ingredient, dietary and allergen fields also remain null. AI assists editable title/description only; never publishes. Keep this regression protection. Nullable DTO shapes and endpoint envelopes did not change.

Both AI routes declare `maxDuration = 60`; Gemini fetch aborts after 45 seconds. Production build metadata records 60 seconds. The connected Vercel dashboard account lacks access to the actual project (`happydragon123s-projects/coderedorion`), so direct function-dashboard inspection remains unverified. Do not create a duplicate project to work around this.

## Verification completed

- `npm run check`: lint, typecheck, 13 unit tests and production build passed; two opt-in live suites skipped by the default command.
- The separate opt-in hosted runner passed manual post/feed/reserve/cancel/re-reserve/close/collect, duplicate collection/impact, foreign mutation denial, a two-account last-portion race (201/409), supplied-photo privacy before attachment, attached-photo access, real Gemini draft, reviewed publish, grounded search, unknown dietary-tag exclusion, private pickup/collection and unauthenticated AI rejection.
- Regular organizer and separate private student Safari sessions completed hosted publish → AI search → correct card/summary/landmark → details → reserve one portion → private code → organizer close → collect. Student refresh showed collected status with the code hidden. Earlier browser cancellation/re-reservation, replaced codes, standard-filter restoration and AI-outage fallback also passed.
- Full local two-session photo/search/pickup rehearsal passed earlier; see the report for details.
- No keys/passwords/private codes were logged or committed. A private build-artifact scan found no Gemini key in `.next/static`.

All created rehearsal listings were closed. Demo history and photo objects persist. This integration added nine simulated collections across its runs; these are not real rescued food. The user explicitly authorized mutations against the disposable demo/test Supabase project. Reconfirm the target if credentials/project change; do not delete persistent records as routine cleanup.

## Priority 1 — shared AI rate limiting and cooldowns

Current `lib/ai/request.ts` uses an in-memory per-user map: one active request and six attempts/minute per process. This is best-effort and resets/scales independently on Vercel. It cannot protect the project's shared provider quota.

Implement shared atomic admission control for both AI endpoints: per-user limits plus a configurable project-wide budget/concurrency limit. Coordinate any Supabase table/RPC/RLS migration with Agent 1, the sole migration owner. Agent 0 owns dependency and environment-template decisions; do not install a new service or require new credentials without coordination.

Authenticate before admission. Bound input before expensive work. Acquire/release concurrency safely even on failure; use expirations so crashed requests cannot hold capacity forever. Do not hold a database transaction open across Gemini calls. Keep database controls independent of client-supplied user IDs. Define storage-outage behavior explicitly and retain manual flows.

Return honest rate-limit errors and a usable cooldown. Distinguish app admission limits from provider 429s without reflecting provider text or credentials. Preserve the existing error envelope; coordinate any new headers/client handling. Avoid automatic retry storms, especially after daily exhaustion. Do not represent the current quota as unlimited.

Acceptance: concurrent requests across separate limiter instances obey shared limits; one user's traffic cannot exhaust the entire project unchecked; failures release slots; expired slots recover; unauthenticated requests cannot spend quota; manual posting/filtering continue during AI denial. Add meaningful focused tests and document configuration.

## Priority 2 — cache search interpretation, always retrieve fresh inventory

Cache validated filter interpretation rather than listing responses, signed photo URLs, summaries, reservations or private codes. On every cache hit, apply policy validation and retrieve fresh inventory under the current user's authenticated Supabase session; generate the summary from those fresh rows. Reservation checks remain atomic in the database.

Include normalized query, caller location/origin, model, prompt/policy version and verified-landmark revision in the cache identity. Preserve user isolation where context requires it. Bound TTL, size and input; do not retain raw queries unnecessarily. Relative dates depend on current time/timezone: either skip caching them or implement an explicit time-aware policy so cached deadlines cannot become stale. Do not cache errors or invalid model output. Deduplicate concurrent identical interpretation requests safely.

Coordinate shared cache storage with the limiter design to avoid redundant dependencies. Tests should demonstrate fewer provider calls for repeated queries while changed inventory immediately affects cards, summaries and sold-out state; changed location/origin/model/policy must not reuse an incompatible interpretation.

## Priority 3 — Agent 2 final UI and map checks

- Verify narrow/mobile layouts for feed/search/details/pickups/share/manage.
- Verify geolocation denial leaves landmark selection and filters usable. Browser location permission requires the human's authorization; do not bypass it.
- Obtain authorized map provider/tiles configuration and verify attribution, pins, coordinate order and list fallback. Map/list fallback and external directions work; configured tiles remain unverified. Do not silently use unauthorized public tiles.
- Rehearse hosted auth redirects/callbacks if configuration changes. No authentication bypasses or fixture-backed production successes.

## Commands and private configuration

```sh
npm ci
npm run dev
npm run check

# Two authenticated minimal AI requests, no inventory writes:
node --import tsx scripts/check-ai-config.ts --live https://coderedorion.vercel.app

# Opt-in real mutations/provider usage against disposable demo data:
FOOD_TEST_AI_INTERVAL_MS=10000 node --import tsx lib/ai/verify-flows.ts --disposable https://coderedorion.vercel.app catered_food.webp
```

The live commands read `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `FOOD_TEST_ORGANIZER_EMAIL`, `FOOD_TEST_ORGANIZER_PASSWORD`, `FOOD_TEST_STUDENT_EMAIL`, `FOOD_TEST_STUDENT_PASSWORD`. Use distinct test accounts. Never send credentials in chat or print environment values. Hosted Gemini configuration lives in Vercel Production and requires redeployment after changes. Do not rerun mutation suites repeatedly without a concrete reason; they consume quota and add simulated totals.

After implementing reliability changes: run the default checks, then a targeted live rehearsal and separate-session hosted check. Record precisely what ran, what was skipped, remaining setup and the deployed commit. Commit focused changes and hand back to Agent 0 for integration. Avoid changing frozen contracts, inventory rules or global UI outside the assigned work.

## Copyable next-agent task

“Read `docs/AGENT_0_HANDOFF.md` and the repository instructions. Own the AI reliability follow-up as Agent 3: implement shared atomic AI admission control and safe search-interpretation caching while retaining fresh authenticated inventory reads and manual fallbacks. Coordinate migrations with Agent 1 and shared configuration/contracts/dependencies with Agent 0. Preserve the manual AI-draft pickup fields introduced by `d580bf9`. Run focused tests plus the standard checks, document configuration and limitations, and provide a focused commit/PR for integration. Do not print or commit secrets or run unbounded live provider tests.”
