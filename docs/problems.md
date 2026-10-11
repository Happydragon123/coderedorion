# Project completion tracker

Reviewed October 10, 2026 against the current code and implementation reports. Original issue numbers are preserved so existing references still work. Hackathon scope: focus on the working demo and core flows. Extra production hardening is deferred below. **Original** identifies your initial requests; **Added** identifies audit findings and later requests.

**Status key:** Implemented locally = code exists, but setup or release checks remain. Partial = some implementation remains. Not started = the requested feature is absent. Only mark an item Done after its relevant setup and verification pass. Completed implementation stays visible instead of being deleted from the list.

## At a glance

### Verified completed tasks

| Task                                  | Completed work                                                                                                                                                  | Evidence                                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| #1 One campus-member experience       | One account uses both Find food and Share food, with common navigation and no role selection.                                                                   | Shared navigation, signup and Account.                                                      |
| #2 Account creation | Implemented; user confirmed signup works on October 11, 2026 and requested no repeated signup verification. | User-reported acceptance; no additional agent signup test. |
| #3 Hosted database enforcement        | Reviewed no-self-reservations migration applied; direct owner/anonymous RPC denial and unchanged reservation counts verified.                                   | [Reservation safety](reservation-safety.md); `scripts/check-hosted-reservation-safety.mjs`. |
| #11 Manage active/history and closure | Done locally: real two-account lifecycle, dialog/network recovery, clock expiry and 320/390px Safari checks passed October 10–11, 2026. Deployment is separate. | Dated evidence under #11 below.                                                             |
| #12 Food-photo experience | Done locally: one existing private photo loaded and fit its feed card in a real authenticated Safari session on October 11, 2026. | Dated smoke evidence under #12; deployment and broader coverage deferred. |
| #13 Search loading / Clear filters | Done locally / user-verified: Clear filters returned standard listings during the one 30-second test-only search on October 11, 2026. Filter layout polish implemented afterward. | Dated user acceptance and delayed-response log under #13; broader visual coverage and deployment separate. |
| #17 Prepared demo dataset | Approved scoped cleanup verified; three labeled posts / 12 portions created through authenticated APIs on October 11, 2026. Deployment is separate. | [Procedure and results](demo-dataset.md); [exact manifest](demo-cleanup-manifest.json). |
| #18 AI-search relevance | Done locally: AI selects and orders plausible food matches from retrieved titles/descriptions; brief grounded summaries replace the clarification-only approach. | Existing-inventory real-provider cuisine/texture checks and focused selection/cache/freshness regressions below. |

The broader #3 frontend deployment/browser checks remain tracked below. Database enforcement no longer depends on shipping the new frontend.

### Implemented locally — setup or verification still needed

| Item                               | What has been implemented                                                                                        | What remains                                                                                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #3 Own-food reservation protection | Own posts have Manage actions; API rejects owner claims; hosted database enforcement is verified.                | Hosted frontend deployment and browser lifecycle checks.                                                                                                                   |
| #5 Password recovery               | Reset-email form, dedicated authenticated password page, recovery callback and server-validated password update. | Recovery redirects saved with approval; default reset template inspected. Deployment remains; real emailed rehearsal excluded by user. Local read-only HTTP checks passed. |
| #4 Existing pickup recognition     | Reopened listings load private pickup context and display the correct actions/status.                            | Hosted lifecycle and desktop/mobile browser checks.                                                                                                                        |
| #7 Sharer identity                 | Account editing, Share food preview and attribution on cards/details.                                            | Hosted two-account attribution/privacy checks passed; deployed rendering remains.                                                                                          |
| #14 Home-page map                  | Guest landmark pins, authenticated live availability, grouped previews, directions and attributed basemap.       | Hosted desktop/mobile, keyboard/touch and recovery-state verification. Guest landmark pins do not represent mock or live food inventory.                                   |
| #19 Required photos | Required upload-on-publish flow, creation contracts, removal protection and additive database trigger implemented. | Hosted migration/read-only checks user-confirmed; isolated SQL behavior and one bounded manual publish check pending. |

### Implemented locally — deployment still needed

| Item                        | Already done                                                                                           | Still to do                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| #6 Session-aware navigation | Four primary links, member More menu with Account/Sign out, session-aware auth links and safe returns. | Local browser sign-out, guest navigation and 320/390px checks passed; hosted verification remains. |

### Remaining implementation / preparation queue

Work top to bottom within each priority group, after the release blockers below.

| Priority   | Item | Remaining task                                                                                             |
| ---------- | ---- | ---------------------------------------------------------------------------------------------------------- |
| After demo | #8   | Optional: edit published listings. Manual posting, closing and pickup management cover the hackathon flow. |
| After demo | #10  | Implemented locally; broader feedback/recovery browser checks deferred as nonblocking at user request. |
| P2         | #19  | Implemented locally; hosted migration/read-only checks user-confirmed. Isolated database behavior and bounded manual acceptance pending. |

Existing synthetic fixtures and historical demo records are present; #17 means a deliberate, repeatable demo-data workflow, rather than the first synthetic record in the repository. The feedback improvements under #10 are implemented locally; broader browser verification is deferred and nonblocking. The bounded #12 private-photo smoke check passed October 11, 2026. #13 received user-reported acceptance after switching the test page to the production build; subsequent filter-layout polish is recorded below. No expanded acceptance matrix is required.

## Do next — close the release blockers

- [x] **#3 hosted database enforcement:** reviewed migration applied to the configured Supabase project; direct owner and anonymous RPC denial verified with no added reservations. Local API/private-context HTTP checks also passed. See [reservation safety](reservation-safety.md).
- [x] Install `supabase/migrations/20261011020000_sharing_identity.sql` in the configured hosted project. Two-account attribution matches saved identity; foreign profiles stay private and anonymous attribution is denied. No data changed during acceptance. New-signup metadata is covered by prior isolated SQL tests; signup was subsequently accepted by the user. See [accounts and profiles](account-profiles.md).
- [x] Signup verification (#2): user confirmed it works on October 11, 2026 and requested no repeat. This is user-reported acceptance; individual email/resend/callback substeps were not newly observed by the agent.
- [ ] User-operated deployment on the other machine with Vercel access, followed by relevant hosted checks for #3, #4, #6, #7 and #14. Provide concrete instructions when ready; do not spend agent time troubleshooting access on this machine. Deployment remains separate and is not authorized by this tracker update.

**Password recovery (#5) is implemented locally and signup (#2) is accepted by the user.** Remaining release work includes user-operated deployment, deployed rendering (#7), and hosted session checks (#6). Sharing-identity setup and member navigation implementation are complete. The bounded #12 and #13 smoke checks are Done locally (#13 uses user-reported acceptance). Defer broader #10 browser acceptance. AI food relevance (#18) is Done locally, with title/description matching, bounded real-provider checks and focused regression coverage below; deployment and browser appearance remain separate. Listing editing (#8) is optional after the demo. AI draft application changes (#9) are removed from scope at user request.

## Implemented locally — details and remaining checks

### 2. Add account creation and a complete onboarding path — Original #1

**Status: Done / user-verified — October 11, 2026.** User confirmed signup works and explicitly requested no additional signup verification. `/sign-up` collects a sharing name, optional organization and matching passwords; real signup, confirmation/resend controls, callback handling and sign-in links are implemented. The sharing-identity migration is installed. This completion uses user-reported acceptance; no agent email/resend/callback rehearsal was performed in this update. See [accounts and profiles](account-profiles.md) for prior technical evidence.

No repeated signup verification is required for the current handoff. Provider operations and future deployment checks remain separate.

Evidence: `components/shared/auth-form.tsx`, `app/sign-in/page.tsx`, `app/auth/callback/route.ts`, profile signup trigger in `supabase/migrations/202610100001_food.sql`.

### 3. Separate your own food from claimable food — Original #3

**Status: Hosted database enforcement verified; frontend deployment/browser checks remain.** Own feed/search posts are labeled and offer Manage rather than Reserve. The API returns 403 for owner claims, and the reviewed migration is applied to the configured hosted database. Direct owner and anonymous RPC denial passed with unchanged reservation counts. Atomic inventory checks remain intact.

- [x] Own-listing actions and API owner rejection.
- [x] Prepared migration and isolated SQL tests.
- [x] Apply the reviewed migration to the configured hosted database.
- [x] Verify direct RPC owner/anonymous denial and unchanged reservation counts.
- [x] Verify local owner API denial and private pickup context using real test-account sessions.
- [ ] Verify hosted frontend deployment and UI behavior.

Evidence and instructions: [reservation safety](reservation-safety.md).

### 4. Recognize existing pickups when opening a listing — Added

**Status: Implemented locally; hosted/browser verification pending.** Detail pages load caller-only pickup context before enabling Reserve, handle reserved/collected/cancelled/expired states, and refresh context after actions or returning focus. Local tests and read-only HTTP checks passed.

- [x] Existing-pickup status/actions and private context loading.
- [ ] Rehearse reserve → reopen → cancel → reopen → reserve again → collect → reopen on the target deployment.
- [ ] Verify closure, expiry, keyboard use and narrow layouts.

Evidence and instructions: [reservation safety](reservation-safety.md).

### 7. Explain who is sharing the food — Original #4

**Implemented locally; migration and hosted two-account data/privacy verification passed. Deployed rendering remains.** Account now edits the saved sharing name/organization; Share food previews the identity and links to edit it. Food cards and details render the name and optional organization through the additive `sharer` DTO. The local migration exposes only approved attribution via an authenticated listing-specific RPC, keeping profile reads self-only and emails private. It is now applied to the configured hosted database. The read-only two-account acceptance passed with existing demo posts. Isolated PostgreSQL privacy/editing tests and read-only local HTTP checks passed. See [accounts and profiles](account-profiles.md).

**Done when:** users can review/update their sharing identity and recipients can see the intended public attribution. Expose only the approved public fields; do not make private emails or whole profiles public.

Evidence: `app/account/page.tsx`, `components/organizer/listing-form.tsx`, `components/student/listing-detail.tsx`, `lib/contracts.ts`, profile RLS policies. Coordinate any DTO/RLS changes with Agent 0 and Agent 1.

### 14. Interactive home-page availability map — Original #6

**Status: Implemented locally; hosted/browser verification pending.** Home now has visible pickup-landmark pins for guests, live availability for signed-in users, grouped previews, directions and an attributed basemap. Guest landmark pins do not claim food is available. Existing authenticated inventory access is preserved.

- [x] Home-page map implementation and grouped previews.
- [ ] Verify the deployed map on desktop/mobile and with keyboard/touch input.
- [ ] Check loading, empty, signed-out, API-error and tile-failure states; confirm attribution remains visible.

Evidence: `components/home/`, `components/map/`, `app/page.tsx`. The earlier maps-disabled demo decision is historical; the current local map still needs release verification.

### 5. Add password recovery — Added

**Status: Implemented locally; deployment/configuration checks remain.** Sign-in links to `/forgot-password`; the public form requests real Supabase reset emails with neutral success wording, pending feedback and resend cooldown. Recovery callbacks support PKCE and recovery token hashes, force the new-password destination, and send invalid/expired links to a clear retry screen. The password page verifies session; its server action independently calls `requireUser` and validates matching passwords before updating the caller's account.

- [x] Reset-email form, callback handling and authenticated new-password form.
- [x] Password validation, provider-error feedback, success and guest/session-expired states.
- [x] Lint/typecheck/default tests/build and read-only real HTTP checks; no email sent or password changed during verification.
- [x] Verify and configure recovery redirect allowlist with explicit user approval; inspect the default reset-email template.
- [ ] Deploy the updated frontend and callback.
- Real email delivery, valid emailed link and password-change rehearsal: **excluded from scope by the user**.
- The request form and guest navigation were visually verified in Safari at 320px without sending mail. Authenticated reset and invalid links passed HTTP checks; the real emailed rehearsal remains excluded.

Evidence and instructions: [password recovery](password-recovery.md).

## Navigation implementation and release checks

### 1. Confirm one campus-member experience — Completed implementation

A single account shares and collects food. Signup does not select roles; Account and shared navigation expose both flows. Ownership and private pickup protections remain in place. Student/organizer code directories are internal organization, not account types.

### 6. Make navigation and sign-in aware of the session

**Implemented locally; local browser checks passed, deployment remains.** Find food and Share food are available to everyone. Members also see My pickups and a More menu containing Home, Manage food, Impact, Account and direct Sign out. Guests see Sign in/Create account. The brand links Home. This keeps four top-level navigation items on mobile, without removing routes. Sign-out has pending/error feedback and refreshes server-rendered session state. Auth events cannot be overwritten by an older initial user lookup.

Existing protected-page/session checks and safe return destinations are retained. Read-only local HTTP verification is recorded in the release report. No separate account roles or permission changes were added.

Evidence: `components/shared/navigation.tsx`, `app/globals.css`, [hackathon release checks](hackathon-release.md).

## Remaining demo improvements and optional extensions

### 8. Let owners edit published listings — Deferred until after the hackathon demo

The demo supports manual publishing, closing and pickup confirmation. A published-listing editor is deferred as an optional extension; the existing PATCH API stays available. The PATCH API already supports listing field edits.

**Done when:** owners can correct descriptions, instructions, deadlines and permitted quantities using existing contracts; edits explain any lifecycle restrictions and preserve existing reservations.

Evidence: `components/organizer/manage.tsx`, `app/api/listings/[id]/route.ts`, `patchListingSchema` and `patch_food_listing`.

### 10. Finish validation, recovery and action feedback — Added

**Status: Implemented locally; broader browser verification deferred / nonblocking — October 11, 2026.** At user request, prioritize work relevant to the working demo; retain this implemented feedback but defer the broader acceptance pass. This is not a claim that the browser checks passed. Sharing uses human field labels, inline validation and focus on the first invalid control in form order. Drafting, photo upload and publishing have specific pending messages. Student load failures preserve session-expiry information so only session failures offer Sign in; other failures offer retry and browsing. Missing pickup details show a partial-load notice and retry, and reserved pickups with unknown deadlines appear separately as Needs verification until a successful reload reconciles expiry. A session failure while loading listing details is surfaced as an auth failure. Contracts, auth and database behavior are unchanged.

Validation: `npm run lint`, `npm run typecheck`, `npm test` (44 passed, 5 opt-in live suites skipped), and `npm run build`. Field-focus, pending-stage and partial-load browser checks remain unverified, deferred until after the demo or a concrete reported defect; they are not current blockers.

Implemented changes:

| Before                                                                                                                | After                                                                                 | Why                                                                      |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Publishing errors and AI missing fields include schema keys such as `location_id`.                                    | Human field labels, inline errors, and focus on the first invalid field.              | Users can find and correct the problem.                                  |
| Sharing shows generic “Working…”.                                                                                     | Specific drafting/uploading/publishing feedback.                                      | Users know which action is pending.                                      |
| Every student error includes a Sign in link, including network or inventory failures.                                 | Offer sign-in for session failures and the appropriate retry/browse action otherwise. | Recovery matches the actual problem.                                     |
| Pickup listing fetch failures are tolerated, but missing details can leave an uncertain pickup categorized as active. | Explicit partial-load state with retry and reliable status reconciliation.            | Users should not mistake incomplete data for a confirmed current pickup. |

Evidence: `components/organizer/listing-form.tsx`, `components/student/common.tsx`, `components/student/my-pickups.tsx`.

### 11. Make Manage useful after more than a few listings — Added

**Status: Done locally — authenticated verification passed October 10–11, 2026. Deployment is separate.** Manage renders Active listings first and a separately labeled History — closed and expired section, with counts and empty states. Open listings remain active even when sold out; the ten-second clock moves them into history at their deadline. Historical cards report original portions posted, never “available” or inferred collected quantities. Closed listings keep pickup confirmation until the deadline.

Closing opens a native modal dialog naming the listing and explaining that new reservations stop while existing pickups remain valid until the displayed America/Chicago deadline. Keep listing open and Escape cancel before submission. Pending closure disables both dialog actions and prevents Escape dismissal; failures remain in the dialog with an explicit Retry closing action. Success uses the validated PATCH response to update the card immediately and announces the listing and pickup deadline, with keyboard focus moved to the success feedback. No automatic mutation retry is performed.

**Environment and scope:** sequential verification in this checkout, preserving the uncommitted implementation and unrelated edits. Read `AGENTS.md`, `README.md`, `docs/contracts.md`, `lib/contracts.ts` and `campus-food-rescue-handoffs.md`; inspected the four implementation/test files below. Safari 26.6.2 on macOS, local production build at `http://localhost:3001`, real Supabase sessions for the two designated disposable test accounts in normal/private Safari windows. The initial signed-out `/manage` redirect to `/sign-in?next=%2Fmanage` passed; the user then signed in both accounts. Two stale local production servers on port 3001 initially produced an error boundary; restarting as a single server resolved it. No organizer UI defect requiring a source fix was demonstrated.

Acceptance results:

- [x] **Active/history and quantities:** initial inventory displayed one active listing above 51 historical listings. A newly created, open one-portion disposable listing stayed in Active with `0 available of 1 portions posted` after the second account reserved it. Closing it from `/manage` immediately changed Active from 3 to 2 and History from 52 to 53 without a refresh. The closed card showed `1 portions posted`; no available or collected quantity was inferred. A second disposable listing changed from `2 available of 3 portions posted` to Expired / `3 portions posted` on the ten-second clock after its real deadline (October 11, 12:02 AM America/Chicago), without refreshing: Active 2 → 1, History 53 → 54. Closed, closed-and-expired, and open-but-expired history were distinguished.
- [x] **Confirmation, cancellation and focus:** dialogs on both `/manage` and `/manage/[id]` named the long-title disposable listing, displayed its Chicago deadline, and explained retained pickups. Initial focus landed on Keep listing open. Tab/Shift+Tab reached the two dialog actions; the modal kept background page controls inaccessible. Keep listing open via Return and Escape both dismissed the dialog and restored focus to the correct Close listing trigger. Reopening by Return worked. A temporary local request-counting proxy observed **zero PATCH requests** across both cancellation methods before any confirmation.
- [x] **Pending, failure, explicit retry and lost response:** the temporary proxy on port 3002 forwarded ordinary traffic unchanged to the real app and applied fault handling only to the first disposable listing's PATCH. Attempt 1 returned a simulated 503 with the shared error envelope without forwarding the mutation; the dialog retained the error and offered Retry closing. Only an explicit retry sent attempt 2, which forwarded the real authenticated mutation and deliberately dropped its response; the dialog reported uncertainty and offered Retry closing again. Attempt 3 was explicitly requested with an eight-second delay: both actions were disabled, Closing listing… appeared, and Escape did not dismiss the dialog. The validated response reconciled the already-closed listing to Closed, dismissed the dialog, and focused the success notice with its title/deadline. The counter recorded exactly three PATCH attempts, with no automatic retry. The pickup remained reserved through these close attempts and was subsequently collected once.
- [x] **Pickups after closure and expiry:** the second account reserved the first disposable listing before closure. My pickups still showed that reservation active after closure; entering its real private code in the closed, unexpired Manage detail enabled Confirm collection, and keyboard submission returned `collected`. Historical quantity stayed at one portion posted. The second account also reserved the three-portion expiry listing before its deadline. After expiry, entering that reservation's real code left Confirm collection disabled; a direct request from the organizer's authenticated browser to the existing collect endpoint returned **409 CONFLICT**, `Inventory or lifecycle conflict.` The final disposable reservation was cancelled through My pickups; that page then showed no verified active pickups. Private codes and credentials are not included in this report.
- [x] **Narrow layouts and keyboard operation:** both Manage routes were inspected in Safari Responsive Design Mode at **320 × 844** and **390 × 844** with long unbroken titles. Cards, quantities, deadlines, inputs and wrapped action buttons fit the viewport. List/detail dialog opening, Tab/Shift+Tab, keyboard cancellation, Escape and focus return passed; list closure by keyboard at 320px moved the card into History and visibly focused the success notice. At **320 × 400**, the long-title dialog was bounded by the viewport and scrolled; Tab brought Confirm close into view, Shift+Tab returned to cancellation, and Return cancelled with focus returned to the trigger. The 390px dialog also opened/cancelled correctly. These are desktop browser viewport checks, not physical phone or screen-reader acceptance.
- [x] **Required checks rerun after acceptance:** `npm run lint` exit 0, no diagnostics; `npm run typecheck` exit 0, no diagnostics; `npm test` exit 0 — **51 total, 46 passed, 5 opt-in live suites skipped, 0 failed/cancelled/todo**; `npm run build` exit 0 — production compilation, TypeScript, 23-page generation and traces completed (Next.js 16.4.0, webpack). The two focused Manage tests cover sold-out active classification, exact-deadline expiry and historical quantity wording. The manual real-session checks above supplement the skipped automated live suites.

Disposable evidence records (created through real authenticated endpoints; no production fixtures):

| Listing ID                             | Label / portions                          | Final test outcome                                                             |
| -------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------ |
| `af197285-1b56-4db0-b9d2-4f4273e2df21` | `DISPOSABLE #11 Manage verification…` / 1 | Closed; one simulated reservation collected after closure.                     |
| `d5f4a0fc-988f-455f-8286-e9f20e1b75e2` | `DISPOSABLE #11 expiry…` / 3              | Open but deadline expired; its uncollected reservation is effectively expired. |
| `58c8399a-ae46-4d57-8235-4ccfce5160cf` | `DISPOSABLE #11 list closure…` / 1        | Closed from list; its test reservation cancelled after acceptance.             |

The three labeled records remain as test history; no listings, accounts, photos or legitimate pickups were deleted. **One simulated collection was added to demo impact, not real rescued food.** The temporary proxy was stopped after verification and was never added to the repository. Protected pages, endpoint session checks, ownership/RLS, atomic lifecycle rules, shared contracts, migrations and dependencies were not changed. Search/pagination remain outside scope. Existing uncommitted source work remains uncommitted; this continuation changed only this documentation. Deployment and hosted rendering remain separate release work; no deployment was attempted.

Evidence: `components/organizer/manage.tsx`, `components/organizer/manage-state.tsx`, `components/organizer/organizer.module.css`, `scripts/manage-state.test.ts`. The earlier October 10 signed-out verification blocker was resolved by the user-provided real account sessions described above.

### 12. Complete the food-photo experience — Done

**Status: Done locally — October 11, 2026.** The trimmed authenticated existing-photo smoke check passed; deployment and broader coverage remain separate.

Feed cards now use the same private-photo component as listing details. A real `photo_path` requests a five-minute signed URL from the existing authenticated Supabase browser client and private `food-photos` bucket; cards use lazy image loading and a consistent 4:3 photo area. Missing attachments show “No photo provided” without requesting storage or substituting fixtures. Details retain the full-image contain treatment.

Signed-URL creation failures and image-load failures (including expired URLs) replace the image with “Photo unavailable” and an explicitly labeled Retry photo button. Retry clears the previous URL and requests a new signed URL. Path changes remount photo state; effect cleanup and attempt identifiers prevent stale requests/image failures from overwriting newer attempts. No automatic retry or URL renewal is introduced.

**Evidence — October 11, 2026 (local checkout):**

- Source/caller review: `components/student/common.tsx` wires `FoodCard` to `ListingPhoto`, covering both standard feed and AI-search results; the existing detail caller remains compatible. `components/student/listing-photo.tsx`, `photo-state.ts` and `student.module.css` implement signing, fallback, retry and presentation. No auth, storage policies, endpoint utilities, ownership/RLS, contracts, migrations or dependencies changed.
- Focused automated tests in `scripts/listing-photo.test.ts` verify image failure removes the URL, explicit retry accepts a fresh URL, stale signing/image events are ignored, and signing failures/missing URLs remain recoverable. These are state-transition tests, not browser or live-storage acceptance.
- Required checks run once after implementation settled: `npm run lint` **PASS** (exit 0); `npm run typecheck` **PASS** (exit 0); `npm test` **PASS** (53 tests: 48 passed, 5 opt-in live suites skipped, 0 failed); `npm run build` **PASS** (exit 0, production compilation and all 23 static pages generated).
- Required smoke check (trimmed October 11, 2026 at user request): use one existing photo listing in an authenticated session and confirm the private photo loads and fits its feed card. Use existing data; create no new records. This check subsequently passed as recorded below.
- Deferred, nonblocking coverage: multiple accounts, desktop/narrow layout matrix, separate search/detail photo passes, forced signed-URL expiry and browser retry rehearsal. Focused automated failure/retry state tests already passed; actual browser retry recovery remains unverified. Task #11 verification must not be repeated.

**Smoke acceptance — October 11, 2026, approximately `2026-10-11T06:37Z`: PASS.** In the existing authenticated localhost Safari session at `http://localhost:3002/listings`, the existing open/future five-portion `DEMO #17 — Catered lunch plates` listing (`3b5bd28a-b265-4b16-8aba-b132ba33b1a7`) displayed its private supplied-example photo. Accessibility state identified the listing image, and a viewport screenshot showed the decoded buffet image fitting the rounded 4:3 feed-card photo area without overflow or distortion. No fallback/error or retry was needed. This was one local desktop check only; no record, deadline or attachment changed. No credentials, session values, signed URLs or pickup codes were exposed.

The existing port-3001 production process returned a generic page error twice; the temporary port-3002 development server rendered the current checkout successfully with the existing localhost session. The port-3001 process was left running; its runtime error was not diagnosed within these trimmed checks.

**Completion:** the single authenticated existing-photo smoke check passed. Broader visual/recovery coverage, automatic renewal and long-open-tab coverage remain deferred limitations, not hackathon blockers. Existing uncommitted work was preserved; no commit or deployment was performed. Deployment is separate.

### 13. Show search loading clearly and add Clear filters — Done locally / user-verified

**Status: Done locally / user-verified — October 11, 2026.** One authenticated test-only delayed search completed; the user accepted the Clear filters retry. Subsequent layout polish is implemented and separately validated below; broader browser coverage and deployment remain deferred.

**Necessity review — October 11, 2026:** loading text already existed; the prominent notice is usability polish, not a missing-functionality repair. Clear filters adds the useful single reset that was absent. Stale-search guards support correct reset behavior. Device geolocation was subsequently removed at user request. Keep the implemented loading/reset functionality; no further loading embellishment or filter synchronization is required.

Search now has a prominent bordered status notice with “Searching for food…” and the existing up-to-45-second expectation. Its polite, atomic live region sits outside the busy results section so loading announcements are not withheld by `aria-busy`. The notice changes to completion or failure feedback when the request settles. Existing session-expired feedback and card/photo behavior remain intact.

One always-visible **Clear filters** button beside Search food resets the query, pickup landmark, dietary tag, deadline controls and filter/search errors. It exits natural-language search and remounts results with empty filters to fetch fresh standard listings, including when already browsing with default filters. The keyed remount and existing `useResource` effect cleanup prevent a stale search success or failure from restoring cleared results. Back to standard results retains its existing narrower behavior of leaving standard filters intact.

**Evidence — October 11, 2026 (local checkout):**

- Read the required project guidance; inspected the protected `/listings` caller, `food-feed.tsx`, `common.tsx` (`useResource` cleanup), `lib/api-client.ts`, date/time controls and existing styles/tests before implementation. Changes stay in student UI ownership and this tracker. Standard browsing still calls authenticated `api.listings({})` without Gemini; no endpoint, auth, RLS, contract, lifecycle, migration or dependency changes.
- Focused source review checked uncontrolled form resets, controlled landmark/origin/deadline resets, fresh default-results key, unmounted-request cleanup and both geolocation callback guards. `git diff --check` **PASS** (exit 0). No new source-shape tests were added: the current Node harness does not exercise mounted feed/form interactions. These source checks are not runtime race or accessibility acceptance.
- Required commands each ran once after implementation settled: `npm run lint` **PASS** (exit 0, no diagnostics); `npm run typecheck` **PASS** (exit 0, no diagnostics); `npm test` **PASS** (53 total, 48 passed, 5 opt-in live suites skipped, 0 failed/cancelled/todo); `npm run build` **PASS** (exit 0, Next.js 16.4.0 webpack production compilation, TypeScript, all 23 static pages and build traces completed).
- Required smoke check (trimmed October 11, 2026 at user request): with some filter controls edited, start one delayed search, confirm loading feedback is visible, then use Clear filters and confirm controls/default browsing stay reset after the delayed response arrives. Prefer a bounded local test response over a live Gemini call; any simulated response must be explicitly test-only and must not replace production API behavior. Use existing data; create no new records.
- Deferred, nonblocking coverage: desktop/narrow layout matrix, screen-reader acceptance, exhaustive completed/failed search combinations (device-geolocation controls were subsequently removed at user request). These remain unverified limitations; do not claim them passed. The bounded user-operated retry subsequently passed as recorded below. No new authenticated test records or live Gemini calls were performed.

**Initial smoke continuation — October 11, 2026 (before the successful retry): pending user-operated verification.** After #12 passed, a temporary loopback-only proxy at port 3003 was prepared against the current checkout dev server at port 3002. It intercepts at most one `POST /api/ai/search`, verifies the session through the real authenticated `GET /api/listings`, then delays a schema-compatible, explicitly `TEST ONLY #13` response for 30 seconds (halal filter, empty results and a test-only summary). It never forwards AI search to Gemini; ordinary requests retain the real application/API authorization. No proxy code was added to the repository. The user requested that browser actions stop to reduce token usage and offered to perform checks. The delayed search had not been started, loading feedback/Clear filters had not been verified, and no delayed response had arrived. #13 therefore remains implemented locally, not Done. Manual steps were supplied to the user; no relevance (#18), geolocation or broader browser investigation was performed.

**User retry and scoped correction — October 11, 2026:** the user reported that port-3003 listings did not load, landmark options were missing and filters were buggy; they requested removal of Distance from, Maximum straight-line distance and Use my location. The smoke check did **not** pass. Development-server logs showed ordinary `GET /listings?location=&diet=…` form navigations rather than client API requests, consistent with client JavaScript not initializing on that temporary test page. Anonymous terminal checks confirmed the proxied JavaScript assets returned HTTP 200; they do not prove execution in Safari. The exact client failure remains unconfirmed; no new browser inspection was performed after the user requested reduced browser use.

Removed those three controls and their origin/geolocation state and request construction from `components/student/food-feed.tsx`. Landmark, dietary tag and deadline filtering remain. The landmark selector now disables while loading/on failure and names that state explicitly; existing error/retry handling remains. No fixture options, database changes, endpoint/auth/RLS changes or contract changes were introduced. The test target is being switched from the temporary Turbopack dev server to the validated webpack production build, preserving the real session and APIs. This is a retry setup, not a claim that the browser failure is resolved.

Validation after the scoped UI changes: `npm run lint` **PASS**; `npm run typecheck` **PASS**; `npm test` **PASS** (53 total, 48 passed, five opt-in live suites skipped). `npm run build` **PASS** (webpack compilation, TypeScript and 23 static pages). `git diff --check` and focused task/status/control consistency checks **PASS**. Port 3003 now forwards to the production server at port 3002; anonymous health and all sign-in page JavaScript asset reads passed, without browser/session acceptance. No lifecycle/AI runners, new records, deadline edits, live Gemini requests, commit or deployment.

**Smoke acceptance — October 11, 2026: PASS / user-verified.** The test-only proxy logged exactly one search, authenticated `GET /api/listings` HTTP 200, delay start at `2026-10-11T06:45:24.643Z`, and response delivery at `2026-10-11T06:45:54.647Z`. In response to the complete retry instructions, the user reported: “the page works when i clear filters within 30 seconds, the standard listings come back up.” This is user-operated acceptance, supported by the independently recorded bounded delayed response; individual loading/blank-control/late-summary observations were not separately inspected by the agent. No Gemini request was forwarded. The user reported layout defects separately rather than a stale-response failure. The temporary proxy was stopped after this check.

**Filter layout correction — October 11, 2026:** at user request, applied the Emil design-engineering and minimalist UI skills within student-owned source. Landmark and dietary filters share an aligned two-column row, the deadline spans the form width, and Apply filters has a separate action row. Small screens stack the fields with Date above Hour and AM/PM. The deadline label now sits inside its group rather than on a fieldset border; the timezone suffix and minute dropdown are absent from this filter. Hours convert at `:00` minutes through the existing America/Chicago/DST validation. Clearing the deadline restores the empty selection; partial selections ask for date, hour and AM/PM. The organizer's shared date/time picker, persisted deadlines, contracts and authentication remain unchanged. No browser was opened for this polish; final appearance remains user-reviewable rather than agent visually verified.

Validation after layout changes: lint, typecheck and `npm test` **PASS** (48 passed, five opt-in live suites skipped). `npm run build` **PASS** (webpack compilation, TypeScript and 23 static pages); `git diff --check` and focused task/status/time-control consistency **PASS**. No new dependency, listing, upload, reservation, collection, live AI call, commit or deployment.

**Completion:** the trimmed delayed-search/Clear filters check passed on user-reported acceptance. Duplicate-submit prevention and additional filter-context synchronization remain outside scope. Clear filters discards pending search results but does not cancel the server/provider request. Task #11 verification was not repeated; task #12’s single authenticated existing-photo smoke check subsequently passed as recorded above. Existing uncommitted work was preserved; no commit or deployment was performed. Deployment is separate.

Evidence: `components/student/food-feed.tsx`, `components/student/student.module.css`; existing request cleanup in `components/student/common.tsx`.

### 18. Investigate AI-search relevance — Done locally

**Status: Done locally — October 11, 2026; updated to the user's semantic-search preference.** Search now compares available listing titles/descriptions for cuisine, dish and texture relevance, selects plausible matches and orders them by relevance. The initial clarification-only fix was superseded at the user's request: the interface no longer explains that “healthy” needs clarification or repeats an unsupported-criteria lecture. The accepted filter layout and unrelated uncommitted work remain intact. Deployment and manual browser appearance remain separate.

**Original user report and reproduction:** on October 11 the user reported “healthy food” returning leftover pizza. Normal sign-in and in-memory SSR cookies against the existing production app at `http://127.0.0.1:3002` reproduced this at `2026-10-11T06:56:08.846Z`: **HTTP 200**, **`filters: {}`**, valid response schema and the same seven ordered IDs as the real standard feed. `Leftover Pizza Boxes` (`93826203-b449-4dbc-beba-38e0fcd18c2f`, nine available portions) was among them. No fixture inventory or simulated API response was substituted. The baseline does not expose cache hit/miss, so a new provider call on that first request was not independently established. This does not establish that pizza is unhealthy.

**Cause:** the original model only interpreted allowlisted deterministic filters: location, one confirmed dietary tag, straight-line distance and pickup deadline. It omitted other food preferences, and `{}` retrieved every open, future, available listing under the verified session/RLS, ordered by creation time. It never inspected food titles/descriptions for relevance. The old summary claimed matching interpreted filters and the UI advertised food search. A first local fix made those limitations explicit; its real-provider `healthy food` check at `2026-10-11T06:57:57.852Z` returned the same seven IDs with the clarification. Its earlier lint/typecheck/test/build acceptance (52 passed, five skipped) is historical evidence, not the current semantic-search behavior.

**Current behavior and contract:** the user requested associations such as Indian food → curry and creamy food → Alfredo pasta, with no “healthy needs clarification” explanation. The existing `{filters,listings,summary}` response and database contracts remain unchanged. Stage one interprets and validates supported filters through the existing shared interpretation cache. Stage two sends only IDs, titles and bounded descriptions from the authenticated, deterministically filtered inventory to Gemini in one batch. It asks for plausible matches in relevance order using clear culinary associations, respects explicit cuisine descriptions (e.g. Thai curry), and excludes unrelated/weak ingredient-only guesses. It does not infer nutrition, dietary/allergen safety or healthfulness and receives no photos. The server validates the strict internal ID-array schema, rejects unknown/duplicate IDs, maps only to retrieved rows and never restores a listing excluded by filters/RLS. Summaries are deterministic, brief, list actual titles/locations/portions/IDs and describe “possible food matches”; no model-generated nutritional explanation is shown. No-match responses suggest another food request or standard browsing.

**Freshness, cache and bounds:** only validated structured filters are cached, including `{}`; semantic selections are not stored in the filter cache. Relevance uses fresh inventory on every nonempty search, including interpretation-cache hits. A second authenticated retrieval after comparison drops expired, closed, sold-out or otherwise absent selected posts, uses current portions, preserves relevance order and drops posts whose title/description changed during the comparison. New posts are considered on the next search. Cache identity retains query/context/model/timezone/landmarks and advances to `search-v4-title-description-relevance`; temporal bypass and claim/complete/abandon protections remain. Both generations independently use shared admission, lease release, provider cooldown and fail-closed errors. No automatic retries or silently returned all-food results on comparison failure.

Comparison is bounded to **60 retrieved candidates**, **1,000 description characters each**, and **4,096 output tokens**. Larger candidate sets return an explicit request to choose a landmark or use standard filters, rather than silently omitting older posts. The two provider stages share a **45-second elapsed budget**, retaining the existing route `maxDuration = 60`; drafting keeps its original timeout/output defaults. A cold nonempty search normally requires two generations; a cached interpretation still requires one fresh relevance generation. Empty inventory skips relevance. This raises token/admission usage compared with filter-only search; exact token usage was not measured. Truncated descriptions can miss relevant details. Model semantics can still produce false positives/negatives; prompt guidance is not a proof of perfect relevance.

**Real-provider evidence — October 11, 2026:** normal existing-account sign-in, in-memory SSR cookies, schema-validated HTTP checks against the updated local production build at `http://127.0.0.1:3004`, using the seven existing available posts and no mutations:

- `Italian food` at `2026-10-11T07:06:03.595Z`: **HTTP 200**, `{}` filters, only the real `Leftover Pizza Boxes` ID returned, **3,619 ms** end-to-end. This demonstrates a cuisine association beyond literal query matching. IDs were checked against the actual standard feed.
- Initial `creamy food` at `2026-10-11T07:06:06.517Z`: **HTTP 200**, rice-bowl ID returned, **2,922 ms**. Review found only rice/broccoli/carrots/butter in its actual description, so this was treated as an overly loose ingredient-to-texture association. After the first prompt tightening, the bounded explicit recheck at `2026-10-11T07:07:20.632Z` returned cheese pizza (**2,489 ms**); its actual description only lists cheese/pepperoni/vegetarian pizza, so this was also treated as a weak association.
- The final prompt requires explicit texture wording or a dish conventionally defined by that texture, rather than butter/milk/cheese alone. Final `creamy food` check at `2026-10-11T07:08:58.030Z`: **HTTP 200**, `{}` filters, **zero matches**, **1,875 ms**. Assertions checked empty selection, valid contract and no health/nutrition/clarification lecture. No curry or Alfredo post was introduced to make a positive test pass. Real-provider Indian-curry/Alfredo association acceptance remains unverified because those foods are not in the existing inventory; the corresponding unit selections below are test-only.

This semantic continuation made **four search HTTP requests** with at most **eight provider generations** (cached interpretations may avoid a generation), plus authenticated read-only inventory checks. The two explicit texture rechecks followed prompt changes; there was no automatic retry. Earlier baseline/clarification checks used two separate search requests, as recorded above. The measured times are small-sample local observations, not a latency guarantee. No raw provider output, credentials, cookies, signed URLs or pickup codes were logged. Sessions were signed out locally and the task's temporary server/script were stopped/removed. No browser, draft endpoint, mutating lifecycle/AI runner or two-account rehearsal was used.

**Focused automated coverage:** explicit synthetic unit data and provider stubs verify Indian-curry/creamy-Alfredo ID-selection orchestration, ordering and the frozen response shape (not real Gemini semantic recognition); duplicate/unknown/extra-output rejection; exclusion of IDs absent from filtered retrieval; bounded input without photos/pickup instructions/owner fields; empty-inventory provider skip and honest failure; post-comparison freshness and changed-text removal; cached filters with fresh relevance selections; summary grounding, absence of clarification lectures and the 2,000-character limit. Final `npm run lint` **PASS**, `npm run typecheck` **PASS**, `npm test` **PASS** (**61 total, 56 passed, five opt-in live suites skipped, zero failed**) and `npm run build` **PASS** (Next.js 16.4.0 webpack compilation, TypeScript, 23 static pages and traces). Checks were repeated only as the freshness correction and live-provider texture failures led to implementation/prompt changes; final settled checks passed. `git diff --check` **PASS**.

**Completion/limitations:** the original example is reproduced and its cause documented; semantic matching is implemented within existing contracts, bounded real-provider cuisine/texture checks and focused regressions pass, and requested clarification text is removed. #18 remains Done locally for this scoped implementation. Real curry/Alfredo examples, broader relevance quality, browser/screen-reader appearance and hosted deployment are unverified. No frozen shared schema, database migration, dependency, auth guard, ownership/RLS or lifecycle change; no listings, uploads, reservations, collections or deadlines changed. No commit or deployment. Task #19 remains separate.

Evidence: `app/api/ai/search/route.ts`, `lib/ai/relevance.ts`, `lib/ai/relevance.test.ts`, `lib/ai/gemini.ts`, `lib/ai/policy.ts`, `lib/ai/policy.test.ts`, `lib/ai/reliability.ts`, `lib/ai/reliability.test.ts`, `components/student/food-feed.tsx`; unchanged retrieval in `lib/data/food.ts`.

### 17. Prepare the demo dataset — Done

**Status: Done — October 11, 2026, verified `2026-10-11T06:10:12.244Z`.** User-approved scoped database/Storage cleanup and authenticated replacement setup both passed. Target: `wfdadxarsnmnbiiajlok.supabase.co`; local API origin: `http://127.0.0.1:3001`. See [procedure and repeat workflow](demo-dataset.md) and [exact approved manifest/results](demo-cleanup-manifest.json). No commit or deployment.

- [x] Inventory complete administrative records/dependencies and verified locations; revise photo timestamps using exact database precision.
- [x] Resolve ownership/operator gate: user waived Agent 1 coordination and ran administrative SQL. No Agent 1 review is claimed; no service-role shortcut, auth/RLS bypass, policy/migration/contract/dependency changes.
- [x] Review fresh complete preflight: PASS at `2026-10-11T05:36:33.805158+00:00`, with all photo identities/references matched and no unexpected records/dependencies.
- [x] Obtain explicit approval of exact manifest/target: user “yes i do,” recorded `2026-10-11T05:57:59Z`.
- [x] Verify removal of 54 exact synthetic listings / 67 portions, 68 dependent reservations / 24 simulated collections and six zero-reference-only photo candidates; preserve unconfirmed data.
- [x] Create/verify three labeled posts / 12 portions using authenticated photo upload/listing APIs, verified location IDs and fresh deadlines. Zero seeded reservations/collections.

**Cleanup evidence:** initial inventory was 56 listings, 70 reservations, three accounts/profiles, nine locations and 11 photos; impact `(82, 25, 0)`. The first preflight's 11 false photo-identity failures arose from comparing millisecond API timestamps to microsecond database timestamps. User diagnostics verified all IDs/owners/references; exact timestamps were added, retaining strict checks. User later reported `42P01: relation "demo17_manifest" does not exist` while executing cleanup. Fresh authenticated reads and standalone administrative verification at `2026-10-11T06:03:15.875213+00:00` established committed removal despite that error: zero approved IDs remaining, two retained listings/reservations, three accounts/profiles, nine locations, no saved-field differences and impact `(15, 1, 0)`. The exact failing statement remains unknown; destructive SQL must not be rerun.

User-returned Storage verification at `2026-10-11T06:07:28.998014+00:00` confirmed six approved candidates absent, all five preserved photo identities matched, zero candidate references and Houston Room's attachment reference intact. Both unconfirmed listings and their two reservations remain. The retained collected portion is **unclassified**, not evidence of real rescued food. Cleanup did not partition production impact (#15).

**Replacement setup:** one real organizer session used authenticated `POST /api/uploads/photo` once and `POST /api/listings` three times, all with confirmed 201 responses; no uncertain outcome/retry. Setup time `2026-10-11T06:09:31.722Z`. In-memory session cookies and private `.git/demo17-setup-ledger.json` support reconciliation/single-writer operation; no credentials, tokens, signed URLs or codes were recorded. Stable title/ledger checks prevented duplicates before creation.

| Title / portions | Listing ID | Verified location | UTC deadline |
| --- | --- | --- | --- |
| DEMO #17 — Catered lunch plates / 5 | `3b5bd28a-b265-4b16-8aba-b132ba33b1a7` | Student Center South | `2026-10-11T08:09:31.722Z` |
| DEMO #17 — Vegetable rice bowls / 4 | `c2ffd3aa-cdc5-4557-b7ef-e9ccdceb95d4` | M.D. Anderson Library | `2026-10-11T08:39:31.722Z` |
| DEMO #17 — Fresh fruit cups / 3 | `18031571-6251-40b5-8265-fb77e6bce971` | Science & Engineering Classroom Building (SEC) | `2026-10-11T09:09:31.722Z` |

All descriptions explicitly deny real food/pickups; instructions say simulated pickup only and not to travel. Dietary tags describe invented menus, not photo inference. Buffet notes/tags remain unknown and its supplied-example photo is used only for that matching post; the fictional butter bowls disclose milk, and fruit notes disclose unknown cross-contact. The photo hash matched the tracked supplied example; its authenticated upload decoded as WebP 1600×1167. No other photo was uploaded, generated or fetched.

**Verification:** setup acceptance at `2026-10-11T06:09:40.064Z` checked owner, all required fields/labels, location IDs, open status/future relative deadlines, 12 available portions, per-ID/organizer/standard/location-filtered API reads, private image decoding, zero recipe reservation rows and impact `(27, 1, 0)` — delta `(+12, 0, 0)`. Final read-only preservation check at `2026-10-11T06:10:12.244Z` found five total listings, two retained reservations, unchanged saved retained fields/records, all removed IDs absent, five preserved photo identities unchanged, six candidates absent and the one new buffet object present (six photos total). Nine locations remained unchanged.

`git diff --check` and focused manifest/scope/timestamp/SQL consistency checks passed. No application implementation changed; full npm lint/typecheck/test/build commands were not rerun for data/documentation-only work. Existing uncommitted source work is preserved. No browser feature rehearsal, AI calls, full two-account rehearsal or mutating lifecycle/AI runners. #11 remains Done without repetition; #12/#13's trimmed smoke checks were outstanding at dataset setup; both subsequently passed as recorded above. No commit or deployment.

**Limitations:** original full account/profile metadata and private-backup completion were not independently verified; preservation acceptance uses saved retained records/fields, counts, locations and photo identities. Exact failed SQL statement remains unknown. Deadlines are short-lived and require lifecycle-safe review before a later demo; the completed manifest grants no deletion authorization for the new posts. Supplied photo permission supports example demo use only. Deployment, production impact separation and browser/physical-device accessibility acceptance remain separate.

### 19. Require photos for new listings — Implementation complete locally; acceptance pending

**Status: In progress — October 11, 2026.** Required photo selection, upload-on-publish validation/progress/failure/retry, confirmed-upload reuse and replacement invalidation are implemented locally. Creation requires a valid attachment path separately from nullable legacy Listing/row DTOs, drafts and PATCH. Authenticated creation retains caller-owned existing `food-photos` attachment checks; API PATCH prevents attached-photo removal. Additive `20261011040000_required_listing_photos.sql` enforces required photos for INSERTs (including direct RPC calls), validates attachment changes and blocks removing an attached photo. Legacy photo-less edits/closure/history remain supported. Existing image decoding/reencoding, private Storage, auth/RLS, lifecycle locks, private codes and shared AI protections remain. Manual publishing needs no Gemini. The user explicitly waived ownership coordination and requested single-agent work; no agents were spawned.

**Automated evidence:** final local lint/typecheck/tests/build **PASS**; 69 tests, 63 passed, six skipped, zero failed. Focused regressions verify missing/empty/malformed contracts, selection validation, failed upload/no creation, explicit retry, awaiting upload, confirmed-upload reuse, changed-photo invalidation and nullable legacy reads/drafts/PATCH. Existing decoding/reencoding tests pass. Isolated SQL acceptance covers nonexistent/foreign attachments, valid RPC creation, direct insert/update enforcement and retained legacy reservations, but is **unexecuted**: no installed PostgreSQL/PGlite runtime was found; no dependencies were installed. Default tests explicitly report that skip alongside five existing opt-in suites. No hosted test inventory or lifecycle/AI runners were run.

**Database application:** user-confirmed October 11, 2026: migration succeeded and all read-only verification booleans returned true. Reported historical photo-less count **3** is allowed. Raw result tables and independent agent database execution were not supplied; this is user-reported installation evidence, not runtime rejection acceptance. **Manual acceptance:** the user reported the basic missing-photo/valid-photo publish flow works on October 11, 2026. Forced upload/publish failure and retry acceptance were not explicitly reported. The empty photo-error box observed before submission is now rendered only when a validation message exists; its accessibility description is conditional as well. #19 is **not Done** until isolated database behavior and remaining bounded failure/retry acceptance pass. Do not rerun the applied migration. Exact migration, commands, verification SQL and one bounded check are in [required photos](required-photos.md). No commit or deployment. Existing semantic search and accepted filter layout were left untouched.

**Retention:** photos persist after expiry/closure; signed-URL expiry does not delete stored objects. No photos/listings were deleted and no retention job was added. Abandoned-upload retention and historical attached-photo retention are separate follow-ups with reference/history preservation requirements. Confirmed-upload reuse lasts for the mounted form only; uncertain creation responses require checking Manage before retry because creation has no idempotency key. Direct Storage uploads retain the documented decoding bypass boundary; existence/ownership validation is not trusted image-ingestion attestation.

Evidence: `components/organizer/listing-form.tsx`, `components/organizer/photo-attachment.ts`, `lib/contracts.ts`, `lib/server/food/handlers.ts`, `scripts/required-photo.test.ts`, `scripts/verify-required-photos.mjs`, `scripts/required-photos.local.sql`, `supabase/migrations/20261011040000_required_listing_photos.sql`, [read-only installation checks](required-photos-verify.sql).

## Not started — P3

### 15. Separate demo evidence from real impact — Added

Existing verification reports record simulated collections and persistent demo history. The impact screen displays aggregate totals without identifying a demo environment.

**Done when:** demo deployments clearly label simulated activity; production data separation/reset strategy is deferred beyond this disposable hackathon demo; legitimate records must be preserved. Do not present rehearsal collections as real food rescued, and do not delete data casually.

Evidence: `components/organizer/DEMO_READINESS.md`, `components/student/impact-view.tsx`.

### 16. Bring handoff documentation up to date — Completed for the current handoff

The main handoff now points to the current release report and tracker. AI rate limiting/cache work is identified as completed, with dated evidence; earlier reports remain historical. Account migration status now agrees with hosted acceptance.

## Hackathon completion gate

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Run focused checks for changed flows. The normal demo remains: sign in → share → find → reserve → cancel/re-reserve → collect, with private codes and truthful collected totals. Check the deployed UI once shipping is possible.

## Removed from the hackathon gate

These are deferred follow-ups, not reasons to delay a working demo:

- Broader #10 field-focus, pending-stage and partial-load browser acceptance; implementation remains intact. Signup repetition is excluded by user acceptance. Vercel access troubleshooting on this machine is excluded; the user will operate deployment from the other machine when given concrete instructions.
- Broad #12 photo and #13 search acceptance matrices: multi-account photo checks, forced-expiry/retry browser rehearsal, desktop/narrow layout matrices, screen-reader acceptance and exhaustive search/geolocation combinations. The bounded #12 and user-operated #13 smoke checks passed; subsequent #13 layout polish has no expanded browser acceptance claim. Deferred checks remain unverified. Deferral did not remove protections or tests; the distance/geolocation UI was separately removed at explicit user request.
- Repeating the full adversarial/security matrix after each UI-only change, extended quota/lease races, and exhaustive cross-browser/assistive-input coverage. Existing tests and protections remain.
- Production SMTP/delivery operations, cross-device recovery templates, and the previously excluded real emailed reset/password-change rehearsal.
- Manage pagination/search for large histories, automatic photo URL renewal, a complete lifecycle seed matrix, general-purpose automated demo-reset tooling, and production impact-data partitioning. Task #17's approved scoped cleanup and replacement setup are complete; future resets require a new reviewed manifest and approval.

Keep real authentication, RLS, ownership checks, private pickup codes, atomic inventory and manual AI/map fallbacks. These are essential to the app's working flows. Deferral changes this checklist; no protection or test was removed from code.

## Implementation boundaries

This file is a prioritized backlog, not authorization to redesign the database during a UI fix. Follow `docs/contracts.md`: Agent 0 coordinates foundation/auth/shared contracts; Agent 1 owns migrations and lifecycle/backend changes; student and sharing feature ownership remains documented there. Preserve verified sessions, RLS, atomic inventory, real integrations and existing work. No extra dependencies are inherently required for most items above.

October 11, 2026 photo-error follow-up: the user still saw the blank orange box because both local servers (ports 3000/3002) were running the older production build. Inspected the compiled Share bundle and confirmed unconditional error markup in that build. Rebuilt successfully, verified conditional error markup in the new bundle, and restarted both existing local production servers. No additional browser acceptance is claimed; refresh loads the updated build.
