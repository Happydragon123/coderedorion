# Database and food lifecycle setup

Agent 1 owns `supabase/migrations/202610100001_food.sql`. Agent 0 reviewed and froze v1.0 contracts before migration implementation. The original Agent 1 handoff did not apply a remote migration. The configured disposable demo project now has the migration and a verified landmark; see [integration verification](student-integration.md). `.env.local` is preserved.

## Apply once to the intended project

Back up an existing database and review the migration first. Use the Supabase dashboard SQL editor to run the entire migration, or your authenticated Supabase CLI workflow (`supabase link --project-ref YOUR_PROJECT_REF`, then `supabase db push`). Authenticate privately; never place database passwords, provider keys, or service-role keys in repository files or shell command arguments. The migration is transactional and intended for a fresh project with Supabase Auth and Storage schemas. It creates public profiles, locations, listings, reservations, views and RPCs, plus a private `food-photos` bucket. Existing conflicting tables/buckets require an explicit reconciliation rather than rerunning pieces of this migration.

Profile creation runs on signup, and existing Auth users receive a neutral `Campus member` display name. Users may update only their own display/organization names. Create two confirmed Email/password test users through Supabase Auth. The application uses session cookies and the publishable key; no service-role key is needed.

## Verified locations only

No seed data is included because campus and landmark coordinates have not been provided and verified. Insert actual campus landmarks through the dashboard after checking an authoritative campus map or field measurements. Each location requires a name, latitude (-90..90), and longitude (-180..180). UUIDs default automatically. Do not use fixture coordinates or label test food as actual rescued inventory.

## Authorization and inventory

Authenticated users can read listings and locations. Reservation rows/codes are visible only to the student and listing organizer. Table writes for listings/reservations are revoked; all writes use authenticated security-definer functions with fixed empty search paths. Every operation derives identity from `auth.uid()`. The HTTP routes additionally call `requireUser` and validate shared request/response schemas.

Listing-first row locks serialize reserve, cancel, collect and listing edits. Availability counts are computed by a count-only function across all reservations, independently of caller RLS visibility. Collected portions remain committed; reserved portions are committed only before deadline. Expired reservations are projected as expired without requiring a scheduler. Closing stops new claims while allowing collection before deadline. Cancellation on a closed listing does not reopen it; late cancellation records expiry. Cancel retries and collection retries return the existing result. Collection retries retain the original timestamp and never increment impact again. Deadlines cannot change after any reservation, including cancelled reservations.

Pickup codes are random 16-character hexadecimal values, unique within a listing. A code collision fails atomically with 409 and can be retried. Public listing DTOs contain no codes. Impact is aggregate across the project and counts collected records only as rescued portions.

## Photos

`POST /api/uploads/photo` requires an authenticated session and a multipart `photo`, with Content-Length and a total bounded body. JPEG/PNG/WebP input is limited to 5 MiB, checked for matching signatures, decoded with a 25 million pixel limit, rotated, resized to at most 1600 pixels per side and reencoded as WebP with metadata removed. The output is immutable at `USER_UUID/RANDOM_UUID.webp`. Listing writes verify that a photo exists and belongs to the organizer. Bucket MIME and size limits apply independently. Read an owner upload or a listing-linked photo via authenticated Supabase Storage, e.g. a short-lived signed URL; the bucket is never public.

The accepted MVP boundary is that a user can call Storage directly under owner-prefix insert RLS and bypass endpoint decoding. Direct uploads remain private and MIME/size restricted, but those restrictions do not inspect actual image bytes. Strict enforcement across all clients requires a separate trusted ingestion system; do not claim that every stored object has been reencoded. No object update/delete policy is granted, avoiding replacement of referenced photos. Unattached uploads require an administrator cleanup procedure.

## Reproducible verification

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. `scripts/lifecycle.test.ts` runs real Supabase/PostgreSQL operations when explicitly enabled, otherwise reports a skip. It does not read `.env.local`, create accounts, fabricate locations, or apply migrations.

In a **disposable test project** with the migration applied, set these variables in a private environment: `FOOD_TEST_RUN=1`, `FOOD_TEST_URL`, `FOOD_TEST_KEY` (publishable key), `FOOD_TEST_ORGANIZER_EMAIL`, `FOOD_TEST_ORGANIZER_PASSWORD`, `FOOD_TEST_STUDENT_EMAIL`, `FOOD_TEST_STUDENT_PASSWORD`, `FOOD_TEST_LOCATION_ID` (existing verified location UUID). Then run `npm test`. Do not put values in committed scripts or logs. The tests create clearly labeled test listings and close them afterward; collected test records persist and affect impact, so never run them against actual rescue inventory.

The test exercises simultaneous claims for one portion, accurate availability when RLS hides claims, duplicate claims, anonymous RPC denial, unauthorized editing/collection/cancellation, code privacy, deadline immutability, cancellation/re-reservation, closed-listing collection, exactly-once collection and impact, and effective expiry. A separate browser/API smoke check should verify cookie-session sign-in and multipart uploads in the deployed environment. Live database lifecycle and local HTTP suites have now passed; hosted API smoke checks passed. Live multipart storage verification remains pending. See [integration verification](student-integration.md) for the private runner and current scope. Reset by replacing the disposable project; do not delete real rescue records.

Security design follows the official [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security), [function privilege guidance](https://supabase.com/docs/guides/database/functions), and [Storage access control guidance](https://supabase.com/docs/guides/storage/security/access-control). Security-invoker views require PostgreSQL 15 or newer.

## Verified Google Maps links for pickup spots

After applying Agent 1's locations-link migration, open the intended project's **Table Editor → locations** in the Supabase dashboard. For each existing verified campus landmark, open its exact pickup spot in Google Maps, choose **Share → Copy link**, and paste the HTTPS link into `google_maps_url`. Save the row. Leave the column null if no verified link is available. Use the place/share link rather than a route from your current position.

Supported hosts are `maps.app.goo.gl`, `goo.gl/maps`, `google.com/maps`, `www.google.com/maps` and `maps.google.com`. Credentials, ports, control characters and lookalike domains are rejected. Links are not automatically fetched or used to infer coordinates. Verify the destination belongs to the named pickup landmark before saving; short links hide the destination until opened. Retain independently verified latitude/longitude for distance calculations and the directions fallback. Never guess links or coordinates. Editing verified spots is an administrator task; no public link-editing interface is introduced. Tile maps remain disabled for the demo.

### Migration and deployment

The additive `20261011012419_location_google_maps_url.sql` migration adds nullable `locations.google_maps_url` and includes that value in the existing security-invoker listing availability view's nested location DTO. No coordinate values, location records, grants, RLS policies or lifecycle operations change. Existing authenticated-only location reads and administrator-only location edits remain in force. Backend location/listing reads already select the required rows and validate them with the shared location schema; no alternate DTO mapping is introduced.

An administrator may paste a Google Maps Share link for a verified pickup spot into this column using the Supabase Table Editor. Confirm the link resolves to the actual pickup landmark before saving it. Leave the field null until a real link is supplied; no links are invented or seeded by this migration. Accepted links use HTTPS and exact Google Maps hosts: maps.app.goo.gl with a nonempty path, maps.google.com, or google.com/www.google.com/goo.gl under the `/maps` path. Credentials, ports, whitespace/control characters, encoded controls, backslashes, spoofed hosts and dot-path traversal segments are rejected. Storage caps the URL at 2048 UTF-8 bytes; the shared application schema also validates URL safety. Links are opened externally, not fetched by the backend. Null retains coordinate-based directions.

Deployment order is required: first deploy the optional nullable location contract and frontend, which remain compatible with the old database. After that deployment succeeds, apply the migration. Applying the column/view before updating older strict schemas can cause their location DTO validation to fail. Agent 0 reviewed the migration and shared validation on 2026-10-10. A read-only PostgreSQL check passed all 19 URL acceptance/rejection cases including null, valid host/path variants, empty short links, HTTP, credentials, ports, spoofed hosts, dot traversal and controls. Remote application is pending the integration owner's deployment-ready signal; no location links have been populated.
