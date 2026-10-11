# Project completion priorities

Reviewed October 10, 2026. Work top to bottom within each priority group. Unresolved original requests are marked **Original**; **Added** items come from inspecting the current implementation and the existing verification reports. Completed items are removed from this active backlog. Code findings are not claims that every failure has been reproduced in a new browser session.

The home-page map (Original #6, formerly item 14) is implemented locally and removed from the active issues: visible red pickup pins for guests, live availability for signed-in users, grouped food previews, directions, and an attributed campus basemap without POI icons or road shields. Hosted deployment and browser checks for desktop/mobile, keyboard/touch interaction and recovery states remain in the completion gate below. Other issue numbers are preserved for existing references.

Issues **#3 (own-food reservations)** and **#4 (existing pickup on reopen)** are implemented locally and removed from the active implementation backlog. Own posts have a Manage action; owner API claims return 403; detail pages load the caller's pickup before allowing a new claim and respect reserved/collected/cancelled/expired states. Apply the new no-self-reservations migration to the intended Supabase database to close direct RPC attempts too; it has not been applied to the hosted project. Local SQL/UI tests passed; hosted deployment and browser checks remain in the completion gate. See [reservation safety setup and verification](reservation-safety.md).

**P1:** complete account access and make food handoffs dependable. **P2:** complete everyday management and interaction details. **P3:** expand discovery and finish presentation. No new critical security failure was established by this review.

## P1 — Do first

### 1. Confirm one campus-member experience, without user roles — Original #5

Everybody should be able to share and claim food. This already works at the authorization level: protected pages and feature endpoints require a signed-in user, not a student/organizer role. There is no role field in the profile schema. The remaining work is consistent member-facing language and navigation, rather than a new permissions system. Keep listing ownership and private pickup protections.

**Done when:** a single account can use both flows; copy describes people sharing and collecting food without implying separate account types. Decide this before designing registration and profiles.

Evidence: `lib/server/auth.ts`, `lib/contracts.ts`, both protected route-group layouts.

### 2. Add account creation and a complete onboarding path — Original #1

**Implemented locally; setup and confirmation verification remain.** `/sign-up` now collects a sharing name, optional organization and matching passwords; real Supabase signup, confirmation/resend controls, callback handling and sign-in links are implemented. Install the local sharing-identity migration so confirmation-enabled signup initializes the chosen name. Verify actual email delivery and the new-account confirmation round trip before closing this item. See [accounts and profiles](account-profiles.md).

**Done when:** a new user can create an account and reach the protected app using real Supabase auth, including the deployed confirmation callback.

Evidence: `components/shared/auth-form.tsx`, `app/sign-in/page.tsx`, `app/auth/callback/route.ts`, profile signup trigger in `supabase/migrations/202610100001_food.sql`.

### 5. Add password recovery — Added

There is no forgot-password or reset-password flow. Users who lose access currently have no in-app recovery path.

**Done when:** recovery emails, expired-link errors, and setting a new password work on the deployed site; recovery does not land users in the ordinary sign-in callback without a reset screen.

Evidence: `components/shared/auth-form.tsx`, current auth routes.

### 6. Make navigation and sign-in aware of the session — Original #2, expanded

**Partially implemented locally.** Navigation now responds to session changes, showing Account for members and Sign in/Create account for guests. Sign-in/signup redirect authenticated users, and an allowlisted local return destination survives authentication. Read-only HTTP guards/returns passed. The remaining work is mobile navigation simplification, browser verification of session transitions, and a direct sign-out navigation action (sign-out is available on Account).

**Done when:** authenticated users see account/sign-out actions; guests see sign-in/create-account actions; opening sign-in while authenticated redirects appropriately; a safe local return destination survives authentication. Simplify the eight-link mobile navigation around the main flows.

Evidence: `components/shared/navigation.tsx`, `app/sign-in/page.tsx`, `components/shared/auth-form.tsx`, `lib/server/auth.ts`.

### 7. Explain who is sharing the food — Original #4

**Implemented locally; attribution migration and two-account browser verification remain.** Account now edits the saved sharing name/organization; Share food previews the identity and links to edit it. Food cards and details render the name and optional organization through the additive `sharer` DTO. The local migration exposes only approved attribution via an authenticated listing-specific RPC, keeping profile reads self-only and emails private. It has not been applied to the hosted database; until then, listing identity explicitly appears unavailable. Isolated PostgreSQL privacy/editing tests and read-only local HTTP checks passed. See [accounts and profiles](account-profiles.md).

**Done when:** users can review/update their sharing identity and recipients can see the intended public attribution. Expose only the approved public fields; do not make private emails or whole profiles public.

Evidence: `app/account/page.tsx`, `components/organizer/listing-form.tsx`, `components/student/listing-detail.tsx`, `lib/contracts.ts`, profile RLS policies. Coordinate any DTO/RLS changes with Agent 0 and Agent 1.

## P2 — Complete the everyday experience

### 8. Let owners edit published listings — Added

Manage supports closing listings and confirming pickup codes, but has no editing interface. The PATCH API already supports listing field edits.

**Done when:** owners can correct descriptions, instructions, deadlines and permitted quantities using existing contracts; edits explain any lifecycle restrictions and preserve existing reservations.

Evidence: `components/organizer/manage.tsx`, `app/api/listings/[id]/route.ts`, `patchListingSchema` and `patch_food_listing`.

### 9. Protect entered details when applying an AI draft — Added

`applyDraft` replaces all form fields and clears the date/time and dietary selections, including manually entered pickup details. The form warns about replacement, but does not provide a review step or undo.

**Done when:** users preview/apply draft changes deliberately, preserve manually confirmed pickup fields, and can recover overwritten content. AI must continue leaving dietary and safety claims unconfirmed.

Evidence: `components/organizer/listing-form.tsx`.

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

All owned listings, including closed and expired history, appear together. Historical cards still describe remaining portions as “available.” There is no status filter, search or pagination.

**Done when:** active listings come first, history is separate/filterable, closed/expired quantities use accurate language, and longer histories remain manageable. Add a deliberate confirmation before closing; explain that existing pickups remain valid until their deadline.

Evidence: `components/organizer/manage.tsx`, `lib/data/food.ts`.

### 12. Complete the food-photo experience — Added

Feed cards do not display uploaded food photos. Detail photos have retry handling for signed-URL creation failures, but no image-load error handler; signed URLs are valid for only five minutes.

**Done when:** cards use available real photos with a clean no-photo state; details recover from failed/expired image URLs without displaying a broken image. Verify long-open tabs and refresh behavior before deciding whether automatic renewal is needed.

Evidence: `FoodCard` in `components/student/common.tsx`, `components/student/listing-photo.tsx`.

### 13. Make search and filter state predictable — Added

AI Search remains enabled while a request is loading, so repeated submissions can overlap or hit the existing admission limits. Standard filters have no single reset action; AI search can use a newly selected landmark before standard filters are applied.

**Done when:** search has shared pending feedback and duplicate-submit protection; active filters are visible and clearable; selected versus applied location context is consistent. Preserve browsing without Gemini.

Evidence: `components/student/food-feed.tsx`.

## P3 — Expand discovery and finish presentation

### 15. Separate demo evidence from real impact — Added

Existing verification reports record simulated collections and persistent demo history. The impact screen displays aggregate totals without identifying a demo environment.

**Done when:** demo deployments clearly label simulated activity; production uses an agreed separation/reset strategy that preserves legitimate records. Do not present rehearsal collections as real food rescued, and do not delete data casually.

Evidence: `components/organizer/DEMO_READINESS.md`, `components/student/impact-view.tsx`.

### 16. Bring handoff documentation up to date — Added

Some documents disagree with newer verification evidence: contracts still say live verification is pending, and the main handoff lists AI rate limiting/caching as next work although README reports both implemented and verified.

**Done when:** setup, current limitations, completion status and repeatable verification commands agree, with dates and links to evidence. Keep this backlog updated as items ship.

Evidence: `docs/contracts.md`, `campus-food-rescue-handoffs.md`, `README.md`.

## Required completion gate — Run alongside each relevant fix

Before calling the project finished, run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Default tests skip the opt-in live suites, so a passing default run alone does not establish live integration readiness.

Recheck the changed flows with two real test accounts: registration/recovery, session-aware navigation, post/edit, owner self-reservation rejection, reserve/cancel/re-reserve/close/collect, duplicate and sold-out conflicts, private codes, AI failure/manual fallback, and map failure if maps are enabled. Check desktop and narrow mobile layouts, keyboard focus, reduced motion and deployed auth callbacks. Earlier successful rehearsals are evidence of prior behavior, not a substitute for checking new changes.

## Implementation boundaries

This file is a prioritized backlog, not authorization to redesign the database during a UI fix. Follow `docs/contracts.md`: Agent 0 coordinates foundation/auth/shared contracts; Agent 1 owns migrations and lifecycle/backend changes; student and sharing feature ownership remains documented there. Preserve verified sessions, RLS, atomic inventory, real integrations and existing work. No extra dependencies are inherently required for most items above.
