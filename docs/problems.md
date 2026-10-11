# Project completion tracker

Reviewed October 10, 2026 against the current code and implementation reports. Original issue numbers are preserved so existing references still work. Hackathon scope: focus on the working demo and core flows. Extra production hardening is deferred below. **Original** identifies your initial requests; **Added** identifies audit findings and later requests.

**Status key:** Implemented locally = code exists, but setup or release checks remain. Partial = some implementation remains. Not started = the requested feature is absent. Only mark an item Done after its relevant setup and verification pass. Completed implementation stays visible instead of being deleted from the list.

## At a glance

### Verified completed tasks

| Task                                  | Completed work                                                                                                                                                  | Evidence                                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| #1 One campus-member experience       | One account uses both Find food and Share food, with common navigation and no role selection.                                                                   | Shared navigation, signup and Account.                                                      |
| #3 Hosted database enforcement        | Reviewed no-self-reservations migration applied; direct owner/anonymous RPC denial and unchanged reservation counts verified.                                   | [Reservation safety](reservation-safety.md); `scripts/check-hosted-reservation-safety.mjs`. |
| #11 Manage active/history and closure | Done locally: real two-account lifecycle, dialog/network recovery, clock expiry and 320/390px Safari checks passed October 10–11, 2026. Deployment is separate. | Dated evidence under #11 below.                                                             |

| #17 Prepared demo dataset | Approved scoped cleanup verified; three labeled posts / 12 portions created through authenticated APIs on October 11, 2026. Deployment is separate. | [Procedure and results](demo-dataset.md); [exact manifest](demo-cleanup-manifest.json). |

The broader #3 frontend deployment/browser checks remain tracked below. Database enforcement no longer depends on shipping the new frontend.

### Implemented locally — setup or verification still needed

| Item                               | What has been implemented                                                                                        | What remains                                                                                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #2 Account creation                | Signup, sharing identity fields, confirmation/resend and callback handling.                                      | Migration installed; real email delivery and deployed confirmation round trip remain.                                                                                      |
| #3 Own-food reservation protection | Own posts have Manage actions; API rejects owner claims; hosted database enforcement is verified.                | Hosted frontend deployment and browser lifecycle checks.                                                                                                                   |
| #5 Password recovery               | Reset-email form, dedicated authenticated password page, recovery callback and server-validated password update. | Recovery redirects saved with approval; default reset template inspected. Deployment remains; real emailed rehearsal excluded by user. Local read-only HTTP checks passed. |
| #4 Existing pickup recognition     | Reopened listings load private pickup context and display the correct actions/status.                            | Hosted lifecycle and desktop/mobile browser checks.                                                                                                                        |
| #7 Sharer identity                 | Account editing, Share food preview and attribution on cards/details.                                            | Hosted two-account attribution/privacy checks passed; deployed rendering remains.                                                                                          |
| #14 Home-page map                  | Guest landmark pins, authenticated live availability, grouped previews, directions and attributed basemap.       | Hosted desktop/mobile, keyboard/touch and recovery-state verification. Guest landmark pins do not represent mock or live food inventory.                                   |
| #12 Food-photo experience | Feed cards use private photos; missing/failed photos have fallback and explicit retry. | One authenticated existing-photo smoke check remains; broader coverage deferred; see #12. |
| #13 Search loading / Clear filters | Prominent accessible search status and one explicit reset to fresh standard browsing. | One delayed-search/Clear filters smoke check remains; broader coverage deferred; see #13. |

### Implemented locally — deployment still needed

| Item                        | Already done                                                                                           | Still to do                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| #6 Session-aware navigation | Four primary links, member More menu with Account/Sign out, session-aware auth links and safe returns. | Local browser sign-out, guest navigation and 320/390px checks passed; hosted verification remains. |

### Remaining implementation / preparation queue

Work top to bottom within each priority group, after the release blockers below.

| Priority   | Item | Remaining task                                                                                             |
| ---------- | ---- | ---------------------------------------------------------------------------------------------------------- |
| After demo | #8   | Optional: edit published listings. Manual posting, closing and pickup management cover the hackathon flow. |
| P2         | #10  | Implemented locally: validation, recovery and action feedback; browser verification remains.               |

Existing synthetic fixtures and historical demo records are present; #17 means a deliberate, repeatable demo-data workflow, rather than the first synthetic record in the repository. The feedback improvements under #10 are implemented locally; browser verification remains. The photo and filter improvements under #12 and #13 are implemented locally; their outstanding verification is listed above and in the detailed evidence below.

## Do next — close the release blockers

- [x] **#3 hosted database enforcement:** reviewed migration applied to the configured Supabase project; direct owner and anonymous RPC denial verified with no added reservations. Local API/private-context HTTP checks also passed. See [reservation safety](reservation-safety.md).
- [x] Install `supabase/migrations/20261011020000_sharing_identity.sql` in the configured hosted project. Two-account attribution matches saved identity; foreign profiles stay private and anonymous attribution is denied. No data changed during acceptance. New-signup metadata is covered by the prior isolated SQL tests; actual signup confirmation remains unverified. See [accounts and profiles](account-profiles.md).
- [ ] Verify actual signup email delivery, resend and deployed confirmation callbacks; check poster names using two accounts.
- [ ] Deploy the current frontend/API changes and run the relevant browser and lifecycle checks for #3, #4, #6, #7 and #14. Confirm the deployment and database versions agree.

**Password recovery (#5) is now implemented locally.** Remaining release work is signup confirmation (#2), deployed rendering (#7), and hosted session checks (#6). Sharing-identity setup and member navigation implementation are complete. Listing editing (#8) is optional after the demo. AI draft application changes (#9) are removed from scope at user request.

## Implemented locally — details and remaining checks

### 2. Add account creation and a complete onboarding path — Original #1

**Implemented locally; setup and confirmation verification remain.** `/sign-up` now collects a sharing name, optional organization and matching passwords; real Supabase signup, confirmation/resend controls, callback handling and sign-in links are implemented. The sharing-identity migration is now installed so confirmation-enabled signup can initialize the chosen name. Verify actual email delivery and the new-account confirmation round trip before closing this item. See [accounts and profiles](account-profiles.md).

**Done when:** a new user can create an account and reach the protected app using real Supabase auth, including the deployed confirmation callback.

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

**Status: Implemented locally; browser verification remains.** Sharing uses human field labels, inline validation and focus on the first invalid control in form order. Drafting, photo upload and publishing have specific pending messages. Student load failures preserve session-expiry information so only session failures offer Sign in; other failures offer retry and browsing. Missing pickup details show a partial-load notice and retry, and reserved pickups with unknown deadlines appear separately as Needs verification until a successful reload reconciles expiry. A session failure while loading listing details is surfaced as an auth failure. Contracts, auth and database behavior are unchanged.

Validation: `npm run lint`, `npm run typecheck`, `npm test` (44 passed, 5 opt-in live suites skipped), and `npm run build`. Browser interaction checks for field focus, pending stages and partial-load recovery remain before marking Done.

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

### 12. Complete the food-photo experience — Implemented locally

**Status: Implemented locally; one authenticated existing-photo smoke check remains outstanding.**

Feed cards now use the same private-photo component as listing details. A real `photo_path` requests a five-minute signed URL from the existing authenticated Supabase browser client and private `food-photos` bucket; cards use lazy image loading and a consistent 4:3 photo area. Missing attachments show “No photo provided” without requesting storage or substituting fixtures. Details retain the full-image contain treatment.

Signed-URL creation failures and image-load failures (including expired URLs) replace the image with “Photo unavailable” and an explicitly labeled Retry photo button. Retry clears the previous URL and requests a new signed URL. Path changes remount photo state; effect cleanup and attempt identifiers prevent stale requests/image failures from overwriting newer attempts. No automatic retry or URL renewal is introduced.

**Evidence — October 11, 2026 (local checkout):**

- Source/caller review: `components/student/common.tsx` wires `FoodCard` to `ListingPhoto`, covering both standard feed and AI-search results; the existing detail caller remains compatible. `components/student/listing-photo.tsx`, `photo-state.ts` and `student.module.css` implement signing, fallback, retry and presentation. No auth, storage policies, endpoint utilities, ownership/RLS, contracts, migrations or dependencies changed.
- Focused automated tests in `scripts/listing-photo.test.ts` verify image failure removes the URL, explicit retry accepts a fresh URL, stale signing/image events are ignored, and signing failures/missing URLs remain recoverable. These are state-transition tests, not browser or live-storage acceptance.
- Required checks run once after implementation settled: `npm run lint` **PASS** (exit 0); `npm run typecheck` **PASS** (exit 0); `npm test` **PASS** (53 tests: 48 passed, 5 opt-in live suites skipped, 0 failed); `npm run build` **PASS** (exit 0, production compilation and all 23 static pages generated).
- Required smoke check (trimmed October 11, 2026 at user request): use one existing photo listing in an authenticated session and confirm the private photo loads and fits its feed card. Use existing data; create no new records. No browser or authenticated photo checks have been performed for this task.
- Deferred, nonblocking coverage: multiple accounts, desktop/narrow layout matrix, separate search/detail photo passes, forced signed-URL expiry and browser retry rehearsal. Focused automated failure/retry state tests already passed; actual browser retry recovery remains unverified. Task #11 verification must not be repeated.

**Done when:** the single authenticated existing-photo smoke check passes. Broader visual/recovery coverage, automatic renewal and long-open-tab coverage remain deferred limitations, not hackathon blockers. Existing uncommitted work was preserved; no commit or deployment was performed. Deployment is separate.

### 13. Show search loading clearly and add Clear filters — Implemented locally

**Status: Implemented locally; one delayed-search/Clear filters smoke check remains outstanding.**

**Necessity review — October 11, 2026:** loading text already existed; the prominent notice is usability polish, not a missing-functionality repair. Clear filters adds the useful single reset that was absent. Stale-search and pending-geolocation guards support correct reset behavior. Keep the implemented functionality; no further loading embellishment or filter synchronization is required.

Search now has a prominent bordered status notice with “Searching for food…” and the existing up-to-45-second expectation. Its polite, atomic live region sits outside the busy results section so loading announcements are not withheld by `aria-busy`. The notice changes to completion or failure feedback when the request settles. Existing session-expired feedback and card/photo behavior remain intact.

One always-visible **Clear filters** button beside Search food resets the query, pickup landmark, dietary tag, distance origin/device location, maximum distance, deadline controls, filter/search errors and geolocation feedback. It exits natural-language search and remounts results with empty filters to fetch fresh standard listings, including when already browsing with default filters. The keyed remount and existing `useResource` effect cleanup prevent a stale search success or failure from restoring cleared results. Pending geolocation callbacks are invalidated so they cannot restore a cleared origin. Back to standard results retains its existing narrower behavior of leaving standard filters intact.

**Evidence — October 11, 2026 (local checkout):**

- Read the required project guidance; inspected the protected `/listings` caller, `food-feed.tsx`, `common.tsx` (`useResource` cleanup), `lib/api-client.ts`, date/time controls and existing styles/tests before implementation. Changes stay in student UI ownership and this tracker. Standard browsing still calls authenticated `api.listings({})` without Gemini; no endpoint, auth, RLS, contract, lifecycle, migration or dependency changes.
- Focused source review checked uncontrolled form resets, controlled landmark/origin/deadline resets, fresh default-results key, unmounted-request cleanup and both geolocation callback guards. `git diff --check` **PASS** (exit 0). No new source-shape tests were added: the current Node harness does not exercise mounted feed/form interactions. These source checks are not runtime race or accessibility acceptance.
- Required commands each ran once after implementation settled: `npm run lint` **PASS** (exit 0, no diagnostics); `npm run typecheck` **PASS** (exit 0, no diagnostics); `npm test` **PASS** (53 total, 48 passed, 5 opt-in live suites skipped, 0 failed/cancelled/todo); `npm run build` **PASS** (exit 0, Next.js 16.4.0 webpack production compilation, TypeScript, all 23 static pages and build traces completed).
- Required smoke check (trimmed October 11, 2026 at user request): with some filter controls edited, start one delayed search, confirm loading feedback is visible, then use Clear filters and confirm controls/default browsing stay reset after the delayed response arrives. Prefer a bounded local test response over a live Gemini call; any simulated response must be explicitly test-only and must not replace production API behavior. Use existing data; create no new records.
- Deferred, nonblocking coverage: desktop/narrow layout matrix, screen-reader acceptance, exhaustive completed/failed search combinations and pending-geolocation rehearsal. These remain unverified limitations; do not claim them passed. No browser rehearsals, authenticated test records or live Gemini calls were performed for this task.

**Done when:** the single delayed-search/Clear filters smoke check passes. Duplicate-submit prevention and additional filter-context synchronization remain outside scope. Clear filters discards pending search results but does not cancel the server/provider request. Task #11 verification was not repeated; task #12’s single authenticated existing-photo smoke check remains outstanding. Existing uncommitted work was preserved; no commit or deployment was performed. Deployment is separate.

Evidence: `components/student/food-feed.tsx`, `components/student/student.module.css`; existing request cleanup in `components/student/common.tsx`.

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

`git diff --check` and focused manifest/scope/timestamp/SQL consistency checks passed. No application implementation changed; full npm lint/typecheck/test/build commands were not rerun for data/documentation-only work. Existing uncommitted source work is preserved. No browser feature rehearsal, AI calls, full two-account rehearsal or mutating lifecycle/AI runners. #11 remains Done without repetition; #12/#13's trimmed smoke checks remain outstanding. No commit or deployment.

**Limitations:** original full account/profile metadata and private-backup completion were not independently verified; preservation acceptance uses saved retained records/fields, counts, locations and photo identities. Exact failed SQL statement remains unknown. Deadlines are short-lived and require lifecycle-safe review before a later demo; the completed manifest grants no deletion authorization for the new posts. Supplied photo permission supports example demo use only. Deployment, production impact separation and browser/physical-device accessibility acceptance remain separate.

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

- Broad #12 photo and #13 search acceptance matrices: multi-account photo checks, forced-expiry/retry browser rehearsal, desktop/narrow layout matrices, screen-reader acceptance and exhaustive search/geolocation combinations. Retain only the two bounded smoke checks described above; deferred checks remain unverified. No code or existing tests were removed.
- Repeating the full adversarial/security matrix after each UI-only change, extended quota/lease races, and exhaustive cross-browser/assistive-input coverage. Existing tests and protections remain.
- Production SMTP/delivery operations, cross-device recovery templates, and the previously excluded real emailed reset/password-change rehearsal.
- Manage pagination/search for large histories, automatic photo URL renewal, a complete lifecycle seed matrix, general-purpose automated demo-reset tooling, and production impact-data partitioning. Task #17's approved scoped cleanup and replacement setup are complete; future resets require a new reviewed manifest and approval.

Keep real authentication, RLS, ownership checks, private pickup codes, atomic inventory and manual AI/map fallbacks. These are essential to the app's working flows. Deferral changes this checklist; no protection or test was removed from code.

## Implementation boundaries

This file is a prioritized backlog, not authorization to redesign the database during a UI fix. Follow `docs/contracts.md`: Agent 0 coordinates foundation/auth/shared contracts; Agent 1 owns migrations and lifecycle/backend changes; student and sharing feature ownership remains documented there. Preserve verified sessions, RLS, atomic inventory, real integrations and existing work. No extra dependencies are inherently required for most items above.
