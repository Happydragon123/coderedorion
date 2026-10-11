# Project completion tracker

Reviewed October 10, 2026 against the current code and implementation reports. Original issue numbers are preserved so existing references still work. Hackathon scope: focus on the working demo and core flows. Extra production hardening is deferred below. **Original** identifies your initial requests; **Added** identifies audit findings and later requests.

**Status key:** Implemented locally = code exists, but setup or release checks remain. Partial = some implementation remains. Not started = the requested feature is absent. Only mark an item Done after its relevant setup and verification pass. Completed implementation stays visible instead of being deleted from the list.

## At a glance

### Verified completed task

| Task | Completed work | Evidence |
| --- | --- | --- |
| #1 One campus-member experience | One account uses both Find food and Share food, with common navigation and no role selection. | Shared navigation, signup and Account. |
| #3 Hosted database enforcement | Reviewed no-self-reservations migration applied; direct owner/anonymous RPC denial and unchanged reservation counts verified. | [Reservation safety](reservation-safety.md); `scripts/check-hosted-reservation-safety.mjs`. |

The broader #3 frontend deployment/browser checks remain tracked below. Database enforcement no longer depends on shipping the new frontend.

### Implemented locally — setup or verification still needed

| Item | What has been implemented | What remains |
| --- | --- | --- |
| #2 Account creation | Signup, sharing identity fields, confirmation/resend and callback handling. | Migration installed; real email delivery and deployed confirmation round trip remain. |
| #3 Own-food reservation protection | Own posts have Manage actions; API rejects owner claims; hosted database enforcement is verified. | Hosted frontend deployment and browser lifecycle checks. |
| #5 Password recovery | Reset-email form, dedicated authenticated password page, recovery callback and server-validated password update. | Recovery redirects saved with approval; default reset template inspected. Deployment remains; real emailed rehearsal excluded by user. Local read-only HTTP checks passed. |
| #4 Existing pickup recognition | Reopened listings load private pickup context and display the correct actions/status. | Hosted lifecycle and desktop/mobile browser checks. |
| #7 Sharer identity | Account editing, Share food preview and attribution on cards/details. | Hosted two-account attribution/privacy checks passed; deployed rendering remains. |
| #14 Home-page map | Guest landmark pins, authenticated live availability, grouped previews, directions and attributed basemap. | Hosted desktop/mobile, keyboard/touch and recovery-state verification. Guest landmark pins do not represent mock or live food inventory. |

### Implemented locally — deployment still needed

| Item | Already done | Still to do |
| --- | --- | --- |
| #6 Session-aware navigation | Four primary links, member More menu with Account/Sign out, session-aware auth links and safe returns. | Local browser sign-out, guest navigation and 320/390px checks passed; hosted verification remains. |

### Not started — implementation queue

Work top to bottom within each priority group, after the release blockers below.

| Priority | Item | Remaining task |
| --- | --- | --- |
| After demo | #8 | Optional: edit published listings. Manual posting, closing and pickup management cover the hackathon flow. |
| P2 | #10 | Clear validation, recovery and action feedback. |
| P2 | #11 | Active/history separation and better Manage controls. |
| P2 | #12 | Feed photos and detail photo recovery. |
| P2 | #13 | Clear search loading feedback and a Clear filters action. |
| P2 | #17 | Prepare the demo: remove previous demo data, then add a realistic, clearly labeled dataset. |
| P3 | #15 | Distinguish simulated activity from real impact. |

Existing synthetic fixtures and historical demo records are present; #17 means a deliberate, repeatable demo-data workflow, rather than the first synthetic record in the repository. The smaller feedback/filter improvements under #10 and #13 have existing foundations, but their listed fixes remain open.

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

Several states still feel like implementation output. Improve these without hiding real errors:

| Before | After | Why |
| --- | --- | --- |
| Publishing errors and AI missing fields include schema keys such as `location_id`. | Human field labels, inline errors, and focus on the first invalid field. | Users can find and correct the problem. |
| Sharing shows generic “Working…”. | Specific drafting/uploading/publishing feedback. | Users know which action is pending. |
| Every student error includes a Sign in link, including network or inventory failures. | Offer sign-in for session failures and the appropriate retry/browse action otherwise. | Recovery matches the actual problem. |
| Pickup listing fetch failures are tolerated, but missing details can leave an uncertain pickup categorized as active. | Explicit partial-load state with retry and reliable status reconciliation. | Users should not mistake incomplete data for a confirmed current pickup. |

Evidence: `components/organizer/listing-form.tsx`, `components/student/common.tsx`, `components/student/my-pickups.tsx`.

### 11. Make Manage useful after more than a few listings — Added

All owned listings, including closed and expired history, appear together. Historical cards still describe remaining portions as “available.” Active/history organization and close feedback remain useful for the demo. Search and pagination are deferred until listing volume warrants them.

**Done when:** active listings come first, history is separate/filterable, closed/expired quantities use accurate language, with a simple active/history distinction. Large-history search and pagination are outside the hackathon gate. Add a deliberate confirmation before closing; explain that existing pickups remain valid until their deadline.

Evidence: `components/organizer/manage.tsx`, `lib/data/food.ts`.

### 12. Complete the food-photo experience — Added

Feed cards do not display uploaded food photos. Detail photos have retry handling for signed-URL creation failures, but no image-load error handler; signed URLs are valid for only five minutes.

**Done when:** cards use available real photos with a clean no-photo state; details recover from failed/expired image URLs without displaying a broken image. A retry action is sufficient for the demo; automatic signed-URL renewal and long-open-tab coverage are deferred.

Evidence: `FoodCard` in `components/student/common.tsx`, `components/student/listing-photo.tsx`.

### 13. Show search loading clearly and add Clear filters — Revised scope

Show clear loading feedback while search runs and provide one action to clear the active filters. Duplicate-submit prevention and additional filter-context synchronization are outside this task's hackathon scope.

**Done when:** users can tell when search is loading and use Clear filters to reset the filter controls and displayed results to the default browsing state. Preserve browsing without Gemini.

Evidence: `components/student/food-feed.tsx`.

### 17. Prepare the demo dataset — Revised at user request

**Status: Not started as a repeatable demo-data workflow.** `lib/fixtures.ts` already contains explicit synthetic test fixtures, and earlier live rehearsals left labeled demo history. Remove the previously added demo data before adding a realistic-looking replacement dataset. Document this cleanup-and-setup workflow without silently substituting mock responses for working APIs.

- [ ] Identify and remove the previously added demo listings and their related demo reservations/photo objects before loading the replacement dataset. Scope cleanup to confirmed demo records; preserve real user data, accounts and verified campus locations. Coordinate cleanup with Agent 1.
- [ ] Add realistic-looking food listings with permitted photos, dietary/unknown information, portion counts and future pickup windows at verified campus locations.
- [ ] Provide a small labeled open-listing dataset for the two-account demo. An exhaustive lifecycle fixture matrix is deferred; core lifecycle checks already exist.
- [ ] Document repeatable cleanup and setup without duplicating posts. A general-purpose automated reset tool remains deferred; removing the previously added demo data is part of this task.
- [ ] Label synthetic listings and simulated collections clearly; keep demo impact distinguishable from real rescues (#15).
- [ ] Use an explicit disposable demo/test environment with real auth and the existing APIs/lifecycle rules. Keep UI-only fixtures in explicitly selected test/preview contexts; never silently serve fixtures in production or bypass authorization.

**Done when:** the previously added demo data has been removed and a documented command/workflow produces enough realistic, clearly labeled replacement demo content to exercise feed, map, sharing, management and pickups reliably. Relative deadlines must be refreshed when setting up a demo, not left permanently expired. Do not embed provider keys or invent campus coordinates. Coordinate database seed/reset work with Agent 1.

Evidence: `lib/fixtures.ts`, `docs/verified-pickup-spots.json`, `components/organizer/DEMO_READINESS.md`.


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

- Repeating the full adversarial/security matrix after each UI-only change, extended quota/lease races, and exhaustive cross-browser/assistive-input coverage. Existing tests and protections remain.
- Production SMTP/delivery operations, cross-device recovery templates, and the previously excluded real emailed reset/password-change rehearsal.
- Manage pagination/search for large histories, automatic photo URL renewal, a complete lifecycle seed matrix, general-purpose automated demo-reset tooling, and production impact-data partitioning. Cleanup of previously added demo data remains required for #17.

Keep real authentication, RLS, ownership checks, private pickup codes, atomic inventory and manual AI/map fallbacks. These are essential to the app's working flows. Deferral changes this checklist; no protection or test was removed from code.

## Implementation boundaries

This file is a prioritized backlog, not authorization to redesign the database during a UI fix. Follow `docs/contracts.md`: Agent 0 coordinates foundation/auth/shared contracts; Agent 1 owns migrations and lifecycle/backend changes; student and sharing feature ownership remains documented there. Preserve verified sessions, RLS, atomic inventory, real integrations and existing work. No extra dependencies are inherently required for most items above.
