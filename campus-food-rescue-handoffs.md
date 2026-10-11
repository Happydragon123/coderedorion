# foodsurpl.us: build plan and agent handoffs

Build plan and implementation handoffs. Foundation is implemented; feature work follows the ownership below. Selected stack: Next.js App Router, TypeScript, Supabase Auth/Postgres/Storage, Gemini. Use an existing repository's conventions if they differ. Official project name: foodsurpl.us.

Current continuation handoff: [hackathon release checks](docs/hackathon-release.md) and [completion tracker](docs/problems.md). Shared AI rate limiting/cache and earlier mobile lifecycle checks are complete. Current release work concerns signup confirmation, deployment and browser verification of newer account/navigation/map changes. [The earlier Agent 0 handoff](docs/AGENT_0_HANDOFF.md) is historical; its AI reliability queue has been completed.

## 1. Start here: human setup

1. Create a shared GitHub repository and invite teammates. Agree on one package manager (default npm) and one integration owner.
2. Create a Supabase project. Keep database credentials private. Set up local/deployment environment variables; never paste secrets into prompts, commits, screenshots, or logs.
3. Confirm access to the provided Gemini key with a small server-side request. Record the working model identifier in GEMINI_MODEL; do not assume every model is enabled.
4. Pick a Next.js-compatible deployment provider and deploy the skeleton early. Configure authentication redirect URLs for localhost and the deployed URL.
5. Gather 5-8 verified campus landmark coordinates, 3-5 food photos you may use, and two demo accounts. Do not invent coordinates. Clearly label seeded listings as demo data.
6. Give Agent 0 the foundation handoff below. Run no other implementation agent until its shared contracts and skeleton are merged.

Environment template (names only): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, GEMINI_API_KEY, GEMINI_MODEL. Public Supabase credentials require RLS; secret/service-role credentials must never reach the browser. Prefer user-authenticated operations rather than a service-role shortcut.

## 2. Scope and user flows

Core: sign-in; manual food posting; editable photo-assisted posting; feed and map; one-portion reservation; cancellation; organizer pickup verification; collected-portions totals; typed natural-language search with grounded text summaries.

Organizer: sign in -> Share food -> upload optional photo and type a description -> review draft and complete missing fields -> publish -> manage reservations -> enter pickup code -> confirm collection.

Student: choose campus landmark or optionally allow browser geolocation -> browse/filter or type a natural-language query -> inspect listing -> explicitly reserve -> receive code -> collect -> organizer confirms. Allow cancellation before collection.

Fallbacks: manual posting works without Gemini; standard filters work without Gemini; list view works without map tiles; manual landmark selection works without geolocation.

Defer: group pickup, continuous conversational agents, SMS/push notifications, custom walking routing, automatic allergy identification, speculative carbon savings, and predictive catering models.

## 3. Shared contracts: freeze before parallel work

Agent 0 publishes lib/contracts.ts with TypeScript and runtime validation schemas; docs/contracts.md explains these contracts. Agents must consume them rather than invent replacements.

Tables:
- profiles: id (Auth user UUID), display_name, organization_name nullable.
- locations: id, name, latitude, longitude. Seed verified landmarks.
- listings: id, organizer_id, location_id, title, description, photo_path nullable, portions_total positive integer, pickup_instructions, pickup_deadline timestamptz, dietary_tags, ingredients_notes nullable, allergen_notes nullable, status open|closed, created_at. Dietary tags are explicitly organizer-confirmed; unknown is distinct from a confirmed category.
- reservations: id, listing_id, student_id, pickup_code, status reserved|collected|cancelled|expired, created_at, collected_at nullable.

Store UTC timestamps and display them in America/Chicago. Available portions = total minus collected reservations minus unexpired reserved reservations. Cancellation releases a portion only while the listing is available. Past-deadline reservations are effectively expired even if a background task has not updated their stored status. Availability must not depend on a scheduler running.

Rules:
- One active/collected reservation per student per listing; quantity is always one. A cancelled reservation may be replaced if inventory remains.
- Reservations require an open listing and a future deadline, enforced by database time.
- All reservation-related mutations lock the listing row first, in a consistent order, and run atomically. Never implement reservation as a frontend read followed by an insert.
- Confirm collection once only, by the authenticated organizer, before deadline. Repeated confirmation must not double-count.
- Closing a listing stops new reservations but honors existing reservations until deadline; tell the organizer this. Cancellation restores availability only if still open and before deadline.
- Do not reduce portions_total below reserved+collected commitments or alter deadline after a reservation in the MVP. Organizer can close the listing instead.
- Count only collected reservations as rescued portions; distinguish posts, claims, and collections.
- Pickup codes are random, unique per listing, revealed only to the reservation owner and its organizer. Codes are not public lookup credentials; verification is organizer-authorized and scoped to listing ID.

API contract proposal (Agent 0 finalizes once):
- GET /api/locations -> {locations}
- GET /api/listings with validated location_id, dietary_tag, origin_lat, origin_lng, max_distance_m, pickup_before -> {listings}; max_distance_m is straight-line only. Unknown dietary tags do not satisfy positive dietary filters.
- GET /api/listings/:id -> {listing}
- POST /api/listings -> {listing}, organizer derived from session
- PATCH /api/listings/:id -> {listing}, owner-authorized allowed fields only
- POST /api/listings/:id/reservations -> {reservation}, student derived from session
- POST /api/reservations/:id/cancel -> {reservation}
- POST /api/listings/:id/collect with {pickup_code} -> {reservation}
- GET /api/me/reservations -> {reservations}
- GET /api/me/listings -> {listings}
- GET /api/impact -> {posted_portions,collected_portions,active_reserved_portions}
- POST /api/uploads/photo (multipart) -> {photo_path}; authenticated, image validation/compression limits
- POST /api/ai/listing-draft (multipart: optional photo and typed description; at least one required) -> {draft,missing_fields}; draft field values may be null
- POST /api/ai/search with {query,origin?,location_id?} -> {filters,listings,summary}; query actual data server-side

Listing DTO includes location name/coordinates, available_portions, pickup_deadline, and optional distance_m. Public DTOs exclude private reservation details. Error envelope: {error:{code,message}} with consistent HTTP statuses, including 401 unauthenticated, 403 forbidden, 409 sold out/conflict, 422 invalid input, 429 rate limited, 503 upstream unavailable. Client-supplied user IDs never determine authorization.

## 4. Universal instructions to paste before each handoff

Read AGENTS.md, README.md, docs/contracts.md, and lib/contracts.ts first. Work only within your assigned ownership. Use your own branch or isolated worktree when sharing a repository; never run multiple agents against the same checkout. Do not rewrite shared contracts, install dependencies, change migrations, or alter global styling outside ownership without coordinating with the integration owner. Do not commit secrets. Preserve other work. Implement real integrations with clearly marked local mocks only when credentials are absent; do not silently return fake success. Report missing configuration. Validate server input, keep private API keys server-side, and provide loading/error/empty states. Submit a focused commit/PR with changed files, interfaces, validation run, known limitations, and setup requirements.

## 5. Agent 0: foundation and integration owner (first, sequential)

Objective: establish a runnable shared foundation before feature work.
Own: package.json/lockfile, app/layout.tsx, shared styles/navigation, lib/contracts.ts, lib/supabase/*, lib/server/*, docs/contracts.md, README.md, .env.example, dependency decisions.
Tasks: initialize Next.js/TypeScript if absent; establish runtime schemas; add Supabase browser/server session helpers; configure auth pages and route protection; create shared components and navigation shell; define all endpoint payloads and DTOs; implement a shared API client and fixtures that match the contract; add the selected map dependencies after checking provider/tiles requirements; establish lint/typecheck/build commands; document deployment and config. Coordinate table/API contracts with Agent 1 before freezing them.
Done: app boots; sign-in works with configured Supabase; contracts and ownership are committed; teammates can run the same commands. Deployment skeleton loads. If auth configuration is blocked, report exactly what is missing rather than bypassing authentication.

## 6. Agent 1: database and reliable food lifecycle

Dependencies: Agent 0 merged; sole migration owner.
Own: supabase/migrations/*, supabase seed procedure, lib/data/*, lib/server/food/*, all non-AI API routes including photo uploads.
Tasks: implement tables, constraints, RLS, indexes, storage policies, and profile setup; verify landmarks before seeding; implement session-authorized endpoints and atomic reservation/cancel/collection functions; respect lifecycle rules; provide safe public availability reads and private account views; compute impact from collected records; validate upload MIME/content/size and user-owned storage paths. Public function execution permissions must be explicit and RLS cannot expose codes. If using SECURITY DEFINER, enforce auth identity/ownership inside functions and restrict search_path/grants.
Done: two accounts can publish/reserve/collect; two concurrent requests for one remaining portion yield exactly one success; retries cannot duplicate claims or impact; unauthorized pickup/edit attempts fail; cancellation and expiry behave correctly; other users cannot read codes. Include reproducible setup and meaningful database tests.

## 7. Agent 2: student interface and map

Dependencies: frozen contracts; develop against shared fixtures until Agent 1 endpoints are ready.
Own: app/(student)/*, components/student/*, components/map/*, lib/geo.ts. Coordinate actual route-group layout with Agent 0.
Tasks: implement food cards, filters, listing detail, reservation/cancellation, My pickups, pickup code display, and impact view; campus landmark selector plus optional geolocation; map pins grouped by location; list/map toggle; Haversine straight-line distances in meters, formatted miles; external directions links using validated coordinates; integrate typed natural-language search through the shared Gemini search endpoint. Display donor-confirmed information and unknown fields accurately. Refresh availability after mutations and handle 409 conflicts.
Done: mobile layout works; denial of geolocation leaves manual selection usable; tiles failing leave list usable; coordinate order is verified; distances are labeled straight-line and never claimed as walking times; empty/sold-out/expired states work. No codes appear in public cards.

## 8. Agent 3: organizer interface and Gemini

Dependencies: shared contracts, upload endpoint; request frozen interface additions through Agent 0.
Own: app/(organizer)/*, components/organizer/*, lib/ai/*, app/api/ai/*.
Tasks: manual listing form first, photo preview/upload, AI draft generation, organizer dashboard, close listing, code-based collection. Gemini uses photo plus provided description to produce schema-validated fields and missing_fields. Never publish automatically or infer safety/allergen certainty. Null unknown required values and let organizer fill them. Search interprets natural language into allowlisted validated filters, queries the shared data layer, and summarizes only returned records. Deterministic filters/availability win over model prose; include returned listing IDs for grounded cards. Start with two-stage structured extraction and retrieval; tool calling is optional. Bound input lengths, retries and timeouts; report 429/503 gracefully.
Done: typed posting completes without AI; real Gemini request produces an editable draft; missing location/count/deadline remains visibly missing; search never invents inventory; dietary claims require confirmed tags; publish and pickup verification use real endpoints. Use configurable verified model ID.

## 9. Integration and final review handoff (Agent 0, after feature merges)

Merge database/backend first, then student/organizer changes one at a time. Review migrations separately; run migrations once against the intended project. Resolve shared-file changes intentionally; never overwrite a teammate's work wholesale. Run lint/typecheck/build and meaningful lifecycle checks. Connect mock-backed UI to live endpoints and remove accidental mock defaults.

Run end-to-end with two real accounts: manual post -> feed -> reservation -> cancellation -> re-reservation -> pickup -> one collected portion. Then photo + typed-description draft -> publish -> typed natural-language search -> reservation -> pickup. Verify sold-out race, deadline, unauthorized organizer actions, duplicate confirmation, unknown dietary information, API outage and geolocation denial. Test deployed authentication callbacks rather than localhost alone. Check map attribution and tile provider configuration. Do not announce real-world rescued food from demo fixtures.

Produce final README setup, architecture summary, known limitations, demo reset instructions, deployment URL if deployed, and a 2-minute demo script. Freeze features with enough time for a full rehearsal and fixes.

## 10. Priority when time runs short

Ship in this order: manual post/feed -> reliable reservation/pickup -> Gemini drafting -> grounded typed natural-language search -> map -> cosmetic analytics. Landmark names and external directions can bridge map delays. Do not cut ownership checks, atomic inventory, or honest collection totals to add animations or another API.

## 11. Demo script

Organizer photographs boxed leftovers and types count/location/deadline. Draft appears; organizer confirms information and publishes. Student types a dietary/location request; real listing cards and a grounded text summary appear. Student reserves, shows code; organizer confirms pickup. Impact rises by one collected portion. Mention that campus locations and deadlines coordinate rescue, while AI reduces posting/search effort.
