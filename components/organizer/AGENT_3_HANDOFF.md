# Agent 3 handoff — organizer and Gemini

Branch: `agent-3-organizer-ai`. All implementation is confined to Agent 3 ownership; no contract, migration, dependency, shared navigation, API client, or global stylesheet changes. Build-generated changes to `next-env.d.ts` were restored.

## Implemented

- `/share`: manual validated posting through `api.createListing`, verified landmark loading/retry, organizer-confirmed dietary checkboxes, optional notes and future pickup deadline. Gemini is optional and is never called during manual publishing.
- `/manage` and `/manage/[id]`: owner listings from `api.myListings`, reload/empty/error states, atomic close via existing PATCH, pickup-code collection via existing collect endpoint. Closed listings honor existing reservations until deadline. Only collected reservations count toward impact, including repeated confirmations.
- Optional JPEG/PNG/WebP preview and upload through the existing authenticated photo endpoint. Upload occurs after form validation; its returned path is retained for publication retries.
- `/api/ai/listing-draft`: independently verified session, bounded multipart input, shared decoded/reencoded image validation, server-side Gemini image/text structured generation, shared output schema. Unknown required fields remain null and are listed in `missing_fields`; unrecognized landmarks and past deadlines are cleared. Model dietary, ingredients and allergen claims are discarded. Drafts are editable and never auto-publish. The UI warns that generating replaces form fields and sends the photo/description to Gemini.
- `/api/ai/search`: independently verified session; bounded, validated request; structured allowlisted extraction with real landmark context; caller origin/location take precedence; invented landmarks fail; retrieval through `lib/data/food.listings` under the authenticated Supabase session. Summaries are generated deterministically from returned records, include listing IDs and disclose supported filters. Unknown dietary information cannot match positive tags.
- Gemini uses server `fetch`, configured `GEMINI_MODEL`, `x-goog-api-key`, structured JSON and shared runtime validation. No SDK/dependency added. Timeout 45 seconds; no retries; output cap 8192 tokens; generic 429/503/configuration failures without provider response logging. Per-user, per-process limit: six requests/minute, one in flight.

Uses Google's [structured output documentation](https://ai.google.dev/gemini-api/docs/generate-content/structured-output) and [generateContent API](https://ai.google.dev/api/generate-content). No environment file or provider key is printed or committed.

## Validation

- `npm run lint`: pass, no warnings.
- `npm run typecheck`: pass.
- `npm test`: 7 pass; 2 existing opt-in live suites skipped.
- `node --import tsx --test lib/ai/*.test.ts`: 4 pass (draft unknowns/safety, search grounding/origins, inventory summaries, schema serialization).
- `npm run build`: pass; organizer pages and both AI endpoints compiled.
- Real Gemini smoke: image-assisted draft and structured vegan search extraction passed using saved local configuration. Unknown location/count/deadline stayed null. Initial 20-second attempts timed out; the bounded 45-second implementation passed.
- Local production HTTP checks against configured disposable Supabase: authenticated `/share` and `/manage`, unauthenticated AI rejection, manual creation, own dashboard listing, foreign close/collect rejection, close followed by honored pickup, repeated collection without an extra impact count, private photo upload, spoofed photo rejection, and invalid AI request rejection passed. Both real Gemini HTTP endpoints also passed: image draft unknowns remained visible; vegetarian/location filters retrieved only open available confirmed inventory and excluded the closed test listing.

Repeat live checks only against disposable test accounts/data, with the existing private `FOOD_TEST_ORGANIZER_*` and `FOOD_TEST_STUDENT_*` configuration:

```sh
npm run build
npm run start -- --port 3103
# Separate terminal; explicitly writes labeled demo inventory and a synthetic photo:
FOOD_AI_HTTP_TEST_RUN=1 node --import tsx lib/ai/verify-organizer.ts --disposable http://localhost:3103
# Provider-only smoke; no database mutations:
FOOD_AI_TEST_RUN=1 node --conditions=react-server --import tsx lib/ai/verify-gemini.ts
```

The HTTP script closes its demo listing and signs out its local test sessions in `finally`. Labeled closed listings, collected test reservations and unattached synthetic uploaded objects remain in the disposable database; these are demo activity, never real rescued-food claims.

## Agent 0 integration requests and remaining limits

- Add global navigation links for `/share` and `/manage`; organizer-local navigation is implemented. Agent 3 has intentionally not edited Agent 0's shared layout.
- Add `lib/ai/*.test.ts` to the shared npm test script. The new tests are run separately until Agent 0 updates test discovery.
- Replace the process-local limiter with shared infrastructure before multi-instance deployment. Provider calls can take up to 45 seconds; configure host function timeouts accordingly and monitor actual model latency.
- Pickup deadline input currently requires an offset ISO timestamp. Display uses America/Chicago; a friendlier timezone-aware picker can follow without changing contracts.
- Search supports one dietary tag, location, straight-line radius with caller origin and pickup-before. Unsupported preferences are disclosed and not guaranteed. Standard student filters remain available.
- Browser interaction/accessibility rehearsal, photo attachment read/preview authorization with both accounts, provider outage/rate-limit injection and hosted verification remain to be performed by integration. No deployment or shared-file changes were made.
