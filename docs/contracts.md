# Shared contracts — reviewed v1.0

Source of truth: `lib/contracts.ts`. Agent 0 owns changes. Agent 0 and Agent 1 reviewed the table shape, DTO joins, transaction rules, and upload limits on 2026-10-10. These contracts are frozen for the database handoff; changes require renewed coordination. Feature owners may develop against explicit `lib/fixtures.ts` fixtures. Production never falls back to fixtures.

## Tables and DTOs

- profiles: id (Auth UUID PK), display_name, organization_name nullable.
- locations: id UUID PK, name, latitude, longitude, google_maps_url nullable. Agent 1 seeds verified landmarks only. Google Maps links are manually verified administrator input, validated HTTPS allowlisted Google Maps URLs; location DTOs accept an omitted or null link for backward compatibility. Agent 0/Agent 1 coordinated this additive extension; coordinates remain authoritative for distances.
- listings: id UUID PK, organizer_id (profiles), location_id (locations), title, description, photo_path nullable, portions_total positive integer, pickup_instructions, pickup_deadline timestamptz, dietary_tags text array, ingredients_notes/allergen_notes nullable, status open|closed, created_at timestamptz.
- reservations: id UUID PK, listing_id, student_id (profiles), pickup_code, status reserved|collected|cancelled|expired, created_at, collected_at nullable.

Listing DTO = listing row + nested `location` + `available_portions` + optional `distance_m` and `sharer: {display_name,organization_name}`. Agent 0/Agent 1 coordinated this additive attribution extension on 2026-10-10. The dedicated authenticated `food_listing_sharers(uuid[])` function exposes only these approved sharing fields for requested posts; existing profile RLS and availability view remain unchanged. `sharer` is omitted only when the additive RPC is unavailable before migration installation; UI labels that state explicitly. Public listings never include email, auth metadata, codes or reservations. Reservation DTO is private to its student and listing organizer. Dietary enum: vegetarian, vegan, halal, gluten_free. Empty tags means unknown/unconfirmed, never a positive claim. Notes may be null. Times are ISO-8601 UTC on output; offset ISO timestamps accepted on input. UI displays America/Chicago. IDs are UUIDs. Quantity is always one.

## Endpoints

All feature APIs require a verified session (including reads); `/api/health` is public. Identity comes from `requireUser()`, never a request user ID. Each handler validates input and output with shared schemas and uses `apiError()` for failures. Agent 1 implemented the non-AI endpoints below; AI endpoints remain assigned to Agent 3. Earlier live database/deployed lifecycle verification passed; current account/navigation release checks and remaining gaps are recorded in [the release handoff](hackathon-release.md). New projects still require [database setup](database.md).

| Method / path | Request | Success (200 unless specified) |
| --- | --- | --- |
| GET /api/locations | none | `{locations: Location[]}` |
| GET /api/listings | `listingFiltersSchema` query | `{listings: Listing[]}` |
| GET /api/listings/:id | UUID | `{listing}` |
| GET /api/listings/:id/pickup-context | UUID | `{is_owner,reservation: Reservation \| null}` (caller's pickup only) |
| POST /api/listings | `createListingSchema` JSON | `{listing}` (201) |
| PATCH /api/listings/:id | `patchListingSchema` JSON | `{listing}` |
| POST /api/listings/:id/reservations | no body | `{reservation}` (201) |
| POST /api/reservations/:id/cancel | no body | `{reservation}` |
| POST /api/listings/:id/collect | `{pickup_code}` | `{reservation}` |
| GET /api/me/reservations | none | `{reservations: Reservation[]}` |
| GET /api/me/listings | none | `{listings: Listing[]}` |
| GET /api/me/profile | none | `{profile: Profile}` (own profile only) |
| PATCH /api/me/profile | `{display_name,organization_name}` | `{profile: Profile}` (own profile only) |
| GET /api/impact | none | `{posted_portions,collected_portions,active_reserved_portions}` |
| POST /api/uploads/photo | multipart `photo` | `{photo_path}` (201) |
| POST /api/ai/listing-draft | multipart optional `photo`, `description`; at least one nonempty | `{draft,missing_fields}` |
| POST /api/ai/search | `{query,origin?:{latitude,longitude},location_id?}` | `{filters,listings,summary}` |

Queries: location_id, dietary_tag, origin_lat/origin_lng (paired), max_distance_m (requires origin; 1–100000), pickup_before. Distance is straight-line meters. Unknown tags do not match dietary filters. Search returns only data retrieved under validated deterministic filters. DTO draft contains all creation fields, each nullable; missing_fields lists required fields needing organizer input. Drafting never publishes or confirms dietary/allergen claims. Server policy always clears location, quantity, pickup instructions and deadline from AI drafts and requires organizer entry; ingredient, allergen and dietary fields also remain null. Cap description input at 10000 characters in draft handlers; apply output schema field limits.

Profile PATCH is strict: trimmed display name (1–120 characters), nullable trimmed organization (at most 120; empty becomes null). Both fields are required; IDs, email and roles are rejected. Identity is derived from `requireUser` and protected by self-update RLS. Names are user-chosen public attribution, not authorization or verified affiliations. Signup metadata is only used to initialize these two fields; existing profiles are never overwritten. Setup and local verification: [accounts and profiles](account-profiles.md).

New listing creation requires a nonempty uploaded photo attachment (UUID owner/UUID image filename). Listing/row DTOs, drafts and PATCH retain nullable photo paths for legacy data. Required selection is validated before upload; creation is validated after confirmed upload. Attached photos cannot be removed; existing null-photo listings can still be edited/closed. Apply the additive required-photo trigger for direct RPC/INSERT/UPDATE enforcement; see [required photos](required-photos.md). This scoped change was authorized under the user’s ownership override on October 11, 2026.

Photo max 5 MiB, JPEG/PNG/WebP. Validate file signatures and actual decoded content server-side, not just MIME names. Agent 1 owns compression/storage paths. Private keys remain server-side. Rate limits/timeouts belong to endpoint owners.

Errors: `{error:{code,message}}`. 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 NOT_FOUND; 409 CONFLICT (sold out, duplicate, lifecycle conflict); 422 INVALID_INPUT; 429 RATE_LIMITED; 503 UPSTREAM_UNAVAILABLE or CONFIGURATION_MISSING; 500 INTERNAL_ERROR. Do not leak secrets/provider responses. AI rate-limit responses may additionally include `Retry-After` (integer seconds) and `X-AI-Rate-Limit-Source` (`app` or `provider`); these headers do not change the frozen JSON envelope. Shared client validates responses, throws `ApiClientError` with optional header metadata in `options`, and never substitutes fake success.

## Reviewed database invariants

Availability = total minus collected minus reserved with future deadline (database time); stale reserved rows are effectively expired without a scheduler. Reserve/cancel/collect lock the listing first and run atomically. Only one active/collected reservation per student/listing; cancelled reservations may be replaced. Reserve requires open/future listing and the caller must not own the listing. Agent 0/Agent 1 coordinated the self-reservation rule and private pickup-context extension on 2026-10-10. The API denies owner claims with 403; the reviewed additive migration repeats the ownership check after taking the listing lock. Close blocks new claims but honors existing claims until deadline. No deadline change after any reservation; total cannot fall below reserved+collected commitments. Cancel releases inventory only while open/future. Only organizer collects, scoped to listing and random unique pickup code, before deadline; retries cannot count twice. Codes are never public lookup credentials. RLS must protect codes and storage. Impact counts only collected as rescued, never fixture inventory.

Pickup context verifies session and listing access, then filters `private_reservations` by caller UUID and listing UUID. A current reserved/collected pickup takes priority; otherwise return the newest cancelled/expired history, or null. All context responses use `Cache-Control: private, no-store`. The listing owner does not receive other people's reservations through this endpoint even though organizer RLS permits management reads elsewhere. Ownership and private pickups are not added to public Listing DTOs. Setup/testing: [reservation safety](reservation-safety.md).

## Agent 0 / Agent 1 implementation decisions

- Retain existing schemas and DTOs; derive identities from the verified user session. No additional client identity fields.
- Lifecycle writes use atomic database functions with explicit authenticated execution grants, a fixed search path, and independent `auth.uid()`/ownership checks. Revoke default PUBLIC/anonymous function execution. All lifecycle and listing edits lock the listing first.
- Availability aggregates all reservations without exposing codes. A security-invoker view must not aggregate reservation rows filtered to only the caller by RLS; use a narrowly scoped protected aggregate function returning counts only. Private reservation reads remain protected by student/organizer RLS.
- Private `food-photos` storage uses user-owned UUID paths and authenticated listing-linked reads; owner reads permit draft previews. Objects are immutable through client privileges (no update/delete). Listing creation/edit validates an existing owner attachment path. Server uploads validate signatures and decoded pixels, then reencode with explicit `sharp` 0.35.5 and bounded image dimensions. Accepted MVP boundary: an authenticated owner can upload directly through Storage, bypassing endpoint decoding/reencoding; bucket MIME/size restrictions still apply. Storage policies do not attest decoded content. No service-role dependency is introduced.
- No campus landmark seeds until independently verified coordinates are supplied.

## Routing and ownership

Agent 0: shared layout/styles/navigation, auth routes, proxy, lib/contracts, lib/api-client, fixtures, lib/supabase, lib/server shared helpers, package/lock, configuration/docs. Agent 1: migrations, seeds, lib/data, lib/server/food, non-AI feature APIs. Agent 2: `(student)` routes `/listings`, `/listings/[id]`, `/my-pickups`, `/impact`; components/student, components/map, lib/geo. Agent 3: `(organizer)` routes `/share`, `/manage`, `/manage/[id]`; organizer components, lib/ai, api/ai. Route groups do not change URLs. Feature owners must call requirePageUser in protected page/layout and requireUser in every API handler, plus ownership checks/RLS. Proxy alone is not authorization.
