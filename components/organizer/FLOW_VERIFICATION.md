# Agent 3 flow rehearsal — October 10, 2026 (America/Chicago)

Tested the integrated local app with the user-provided `catered_food.webp` and the existing verified **Student Center South** landmark. All other posting data was labeled dummy/demo data. No campus coordinates were created or changed. No application code, shared files, credentials, dependencies or database migrations were changed.

## Results

| Check | Result |
| --- | --- |
| Manual post → feed → reserve → cancel → re-reserve → collect | PASS, real cookie-authenticated requests with two distinct demo accounts |
| Close stops new claims but honors existing pickups | PASS, collection succeeded after closing |
| Repeat collection does not increase impact again | PASS, same collected timestamp and exactly one impact increment |
| Unauthorized organizer edit/collection | PASS, student received 403 |
| Concurrent requests for the last portion | PASS, one 201 and one 409 across two accounts |
| Real supplied WebP upload | PASS, private storage upload and decoding/reencoding |
| Photo privacy before publication | PASS, owner preview allowed; student signed-URL request denied before attachment |
| Photo visibility after publication | PASS, student signed URL returned actual nonempty WebP bytes |
| Real Gemini image draft | PASS, location/count/instructions/deadline remained null and visibly missing |
| Review/edit draft → publish | PASS, completed dummy fields and attached uploaded photo |
| Natural-language location search | PASS, returned the matching demo listing and only open, available listings at Student Center South |
| Dietary search with unknown dietary tags | PASS, unconfirmed photo listing excluded from vegetarian results |
| AI listing → search → reserve → private code → collection | PASS, one additional collected demo portion |
| Unauthenticated AI requests | PASS, both AI endpoints returned 401 |
| Manual lifecycle with Gemini disabled | PASS, separate production process with blank Gemini variables; AI returned 503 CONFIGURATION_MISSING |

## Browser rehearsal

Safari on `http://localhost:3000`, using the existing signed-in session:

1. Generated a real Gemini draft from the already-selected `catered_food.webp`. Required operational details stayed blank; dietary checkboxes stayed unchecked.
2. Filled dummy title, description, portions, instructions, future offset deadline and selected Student Center South. Published successfully to `/manage/[id]`.
3. Opened listing details through the student interface. Actual photo loaded, dietary/ingredient/allergen information remained unknown and the deadline displayed in America/Chicago.
4. Reserved one portion, viewed private pickup details, cancelled it and verified availability returned from one to two.
5. Reserved again, confirmed that the replacement pickup code differed, closed the listing through the organizer interface and collected the existing reservation using its code.
6. Retried collection; the UI again reported collected and cleared the entered code. Atomic exactly-once behavior was separately asserted by the two-account HTTP runner.

The browser exercise used one existing authenticated session in both organizer and student interfaces; the automated HTTP exercise used **two distinct accounts**. This is not a claim of a two-profile browser test.

## Repeatable runner

Added `lib/ai/verify-flows.ts`, confined to Agent 3 ownership. It reads private local test configuration without printing it. It never substitutes fixtures or bypasses authorization.

With the app running and confirmed demo credentials configured in `.env.local` (`FOOD_TEST_ORGANIZER_EMAIL/PASSWORD`, `FOOD_TEST_STUDENT_EMAIL/PASSWORD`, existing public Supabase configuration):

```sh
node --import tsx lib/ai/verify-flows.ts --disposable http://localhost:3000 catered_food.webp
```

For the no-Gemini fallback, start a separate production process and run the manual-only checks:

```sh
npm run build
GEMINI_API_KEY= GEMINI_MODEL= npm run start -- --port 3104
# Separate terminal:
node --import tsx lib/ai/verify-flows.ts --disposable http://localhost:3104 catered_food.webp --without-ai
```

Both runs exit 0. The live runner is deliberately opt-in because it writes demo records and makes billable provider requests. `npm test` does not launch it.

## Cleanup and validation

All six listings created in this rehearsal were closed: three full-run listings, two manual-fallback listings and one browser listing. Four simulated collection records remain; these are dummy test activity, **not real food rescued**. Cancelled/collected history and two attached example-photo uploads remain for inspection. The scripts sign out only their local test sessions; the pre-existing browser session remains intact. The temporary no-Gemini server was stopped.

- `npm run lint`: pass, no warnings.
- `npm run typecheck`: pass.
- `npm test`: 11 pass; 2 pre-existing opt-in suites skipped. The new live runner passed separately in both full and no-Gemini modes.
- `npm run build`: pass.
- No keys/environment files or supplied photo committed. Build-generated `next-env.d.ts` changes restored.

## Remaining integration work

The student feed currently has **no natural-language search input**. `/api/ai/search` works and passed with real records; an end-to-end browser search cannot be rehearsed until Agent 2 wires the search UI through the existing API client. This was recorded rather than editing Agent 2-owned files.

Hosted deployment/auth callbacks, two isolated browser profiles, mobile/narrow organizer layout, accessibility beyond the observed labeled controls, geolocation/map fallback, injected provider 429/timeouts and shared rate limiting are outside this rehearsal. No deployment was performed.
