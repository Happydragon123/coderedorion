# Shared contracts — provisional v0.1

Source of truth: `lib/contracts.ts`. Agent 0 owns changes. Agent 1 review is **pending**: no other agent/session or database decisions were available when the foundation was created. Do not freeze or start migrations until Agent 1 confirms the table shape, DTO joins, transaction rules, and upload limits below. Feature owners may develop against explicit `lib/fixtures.ts` fixtures. Production never falls back to fixtures.

## Tables and DTOs

- profiles: id (Auth UUID PK), display_name, organization_name nullable.
- locations: id UUID PK, name, latitude, longitude. Agent 1 seeds verified landmarks only.
- listings: id UUID PK, organizer_id (profiles), location_id (locations), title, description, photo_path nullable, portions_total positive integer, pickup_instructions, pickup_deadline timestamptz, dietary_tags text array, ingredients_notes/allergen_notes nullable, status open|closed, created_at timestamptz.
- reservations: id UUID PK, listing_id, student_id (profiles), pickup_code, status reserved|collected|cancelled|expired, created_at, collected_at nullable.

Listing DTO = listing row + nested `location` + `available_portions` + optional `distance_m`. Public listings never include codes/reservations. Reservation DTO is private to its student and listing organizer. Dietary enum: vegetarian, vegan, halal, gluten_free. Empty tags means unknown/unconfirmed, never a positive claim. Notes may be null. Times are ISO-8601 UTC on output; offset ISO timestamps accepted on input. UI displays America/Chicago. IDs are UUIDs. Quantity is always one.

## Endpoints

All feature APIs require a verified session (including reads); `/api/health` is public. Identity comes from `requireUser()`, never a request user ID. Each handler validates input and output with shared schemas and uses `apiError()` for failures. No feature endpoints are implemented in this foundation.

| Method / path | Request | Success (200 unless specified) |
| --- | --- | --- |
| GET /api/locations | none | `{locations: Location[]}` |
| GET /api/listings | `listingFiltersSchema` query | `{listings: Listing[]}` |
| GET /api/listings/:id | UUID | `{listing}` |
| POST /api/listings | `createListingSchema` JSON | `{listing}` (201) |
| PATCH /api/listings/:id | `patchListingSchema` JSON | `{listing}` |
| POST /api/listings/:id/reservations | no body | `{reservation}` (201) |
| POST /api/reservations/:id/cancel | no body | `{reservation}` |
| POST /api/listings/:id/collect | `{pickup_code}` | `{reservation}` |
| GET /api/me/reservations | none | `{reservations: Reservation[]}` |
| GET /api/me/listings | none | `{listings: Listing[]}` |
| GET /api/impact | none | `{posted_portions,collected_portions,active_reserved_portions}` |
| POST /api/uploads/photo | multipart `photo` | `{photo_path}` (201) |
| POST /api/ai/listing-draft | multipart optional `photo`, `description`, `transcript`; at least one nonempty | `{draft,missing_fields}` |
| POST /api/ai/search | `{query,origin?:{latitude,longitude},location_id?}` | `{filters,listings,summary}` |
| POST /api/voice/transcribe | multipart `audio` | `{transcript}` |
| POST /api/voice/speak | `{text}` | audio/mpeg binary |

Queries: location_id, dietary_tag, origin_lat/origin_lng (paired), max_distance_m (requires origin; 1–100000), pickup_before. Distance is straight-line meters. Unknown tags do not match dietary filters. Search returns only data retrieved under validated deterministic filters. DTO draft contains all creation fields, each nullable; missing_fields lists required fields needing organizer input. Drafting never publishes or confirms dietary/allergen claims. Cap description/transcript input at 10000 characters in draft handlers; apply output schema field limits.

Photo max 5 MiB, JPEG/PNG/WebP; audio max 10 MiB/60s, WebM/MP4/Ogg/WAV/MPEG. Validate file signatures and actual decoded content server-side, not just MIME names. Agent 1 owns compression/storage paths; Agent 4 owns provider format adaptation. Private keys remain server-side. Rate limits/timeouts belong to endpoint owners.

Errors: `{error:{code,message}}`. 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 NOT_FOUND; 409 CONFLICT (sold out, duplicate, lifecycle conflict); 422 INVALID_INPUT; 429 RATE_LIMITED; 503 UPSTREAM_UNAVAILABLE or CONFIGURATION_MISSING; 500 INTERNAL_ERROR. Do not leak secrets/provider responses. Shared client validates responses, throws `ApiClientError`, and never substitutes fake success.

## Database invariants for Agent 1 review

Availability = total minus collected minus reserved with future deadline (database time); stale reserved rows are effectively expired without a scheduler. Reserve/cancel/collect lock the listing first and run atomically. Only one active/collected reservation per student/listing; cancelled reservations may be replaced. Reserve requires open/future listing. Close blocks new claims but honors existing claims until deadline. No deadline change after any reservation; total cannot fall below reserved+collected commitments. Cancel releases inventory only while open/future. Only organizer collects, scoped to listing and random unique pickup code, before deadline; retries cannot count twice. Codes are never public lookup credentials. RLS must protect codes and storage. Impact counts only collected as rescued, never fixture inventory.

## Routing and ownership

Agent 0: shared layout/styles/navigation, auth routes, proxy, lib/contracts, lib/api-client, fixtures, lib/supabase, lib/server shared helpers, package/lock, configuration/docs. Agent 1: migrations, seeds, lib/data, lib/server/food, non-AI/voice feature APIs. Agent 2: `(student)` routes `/listings`, `/listings/[id]`, `/my-pickups`, `/impact`; components/student, components/map, lib/geo. Agent 3: `(organizer)` routes `/share`, `/manage`, `/manage/[id]`; organizer components, lib/ai, api/ai. Agent 4: components/voice, lib/voice, api/voice. Route groups do not change URLs. Feature owners must call requirePageUser in protected page/layout and requireUser in every API handler, plus ownership checks/RLS. Proxy alone is not authorization.
