# Demo dataset preparation — completed October 11, 2026

Task #17 is **Done** for the configured demo database. The user-approved scoped database and Storage cleanup and authenticated three-post replacement setup are verified. No commit or deployment occurred. The exact record evidence, approval and setup results are in [demo-cleanup-manifest.json](demo-cleanup-manifest.json). This is a scoped procedure, not a general reset tool.

## Target, ownership and authorization

Target: **wfdadxarsnmnbiiajlok.supabase.co**. The authenticated local application at **http://127.0.0.1:3001** uses that hosted database; localhost is not a separate database. API session identity and all nine locations were verified before setup.

The user explicitly waived the Agent 1 coordination requirement (“ignore how you aren't agent 1”) and offered to run the supplied administrative SQL. No Agent 1 review is claimed. After complete read-only administrative preflight, the user explicitly approved the exact target/manifest (“yes i do”); approval was recorded at `2026-10-11T05:57:59Z`. This authorized 54 exact listing IDs, 68 exact reservation IDs and six exact photo candidates conditional on fresh global zero-reference checks. Accounts/profiles, nine locations, two unconfirmed listings and their dependencies, and five photo objects were preserved. The application still has no authenticated listing/reservation DELETE endpoint or client photo-delete policy. No service-role shortcut, auth/RLS bypass, policy change, migration, contract change or dependency installation was used.

## Exact cleanup results and dated evidence

| Evidence | Result |
| --- | --- |
| Original organizer inventory, `2026-10-11T05:18:51.594Z` | 56 listings, 70 visible reservations, nine locations, 11 owner photos; impact `(82, 25, 0)`. |
| Fresh authenticated reads, `2026-10-11T05:27:29.188Z` | Saved fields/dependencies matched; no replacement titles. |
| User-run administrative preflight, `2026-10-11T05:32:44.628611+00:00` | Three accounts/profiles, 56 listings, 70 total reservations, nine locations, 11 photos across all prefixes; records/dependencies matched. All photo identity predicates initially failed. |
| User-run photo diagnostic, October 11 | All 11 IDs, owners and references matched. API creation timestamps had millisecond precision; database timestamps retained microseconds. Added exact `database_created_at` values and retained strict exact comparisons. |
| Revised administrative preflight, `2026-10-11T05:36:33.805158+00:00` | Complete PASS, all photo identities/references matched, no unexpected records/custom triggers; only expected non-cascading reservation FK. Fingerprint `f4aa21561c3e55e92b53c6dc9a6d0776`. |
| Explicit user approval, recorded `2026-10-11T05:57:59Z` | Exact manifest and target approved; user was database operator. |
| Post-error authenticated reconciliation, `2026-10-11T06:01:34.658Z` | All 54 listing IDs and 68 reservation IDs absent, two retained listings/reservations, impact `(15, 1, 0)`. |
| User-run administrative verification, `2026-10-11T06:03:15.875213+00:00` | Zero approved IDs remain; two retained listings/reservations, three accounts/profiles, nine locations, no saved-field differences. All 11 photo identities matched; six candidate reference counts were zero. |
| User-returned Storage verification, `2026-10-11T06:07:28.998014+00:00` | Six approved candidates absent, five preserved identities matched, zero candidate references; Houston Room's attachment reference intact. |

Removed **54 explicitly synthetic listings / 67 portions**, **68 reservations** (24 collected, 31 cancelled, 10 stored reserved but past deadline, three expired), and **six approved photo objects**. Every removed listing explicitly denied real food/rescue inventory; titles or account ownership alone were not used as provenance. Prior source/report evidence includes the three #11 disposable IDs, `docs/search-integration.md`, `components/organizer/FLOW_VERIFICATION.md`, `components/organizer/DEMO_READINESS.md`, and the original lifecycle/HTTP/AI payloads. Those mutating runners were not run for #17.

Preserved `Houston Room` (`596ca3f6-3383-4781-a98d-ef12bbe50a15`, six portions) and `Leftover Pizza Boxes` (`93826203-b449-4dbc-beba-38e0fcd18c2f`, nine portions). The administrative snapshot found one collected and one cancelled reservation on Houston Room and none on the other retained listing. The retained collection remains **unclassified**; do not call it real rescued food or a simulation without evidence. Preserved all accounts/profiles and nine verified location IDs/names/coordinates/Maps links, plus the retained attachment and four unconfirmed unattached photos.

Cleanup changed `(posted, collected, active reserved)` from **(82, 25, 0) to (15, 1, 0)**. The removed 24 collections were simulated. This cleanup is not production impact partitioning (#15).

The user reported `42P01: relation "demo17_manifest" does not exist` while running cleanup, but independent reads and administrative verification established committed deletion. The exact failing statement/transaction sequence remains unknown. **Never rerun [demo-cleanup.sql](demo-cleanup.sql).** It is an audit artifact with a prominent stop notice. An error after a commit cannot roll back earlier committed work; reconcile exact IDs before any retry. Storage objects were removed through the separate administrative Storage step, never by SQL-deleting `storage.objects` metadata.

## Replacement recipe and verified setup

Creation used real organizer sign-in, in-memory SSR cookies, authenticated `POST /api/uploads/photo` and `POST /api/listings` on the reviewed local app. Cookies/tokens, credentials, signed URLs and pickup codes were never written to the setup ledger or task reports. The private ledger is `.git/demo17-setup-ledger.json` (mode 0600, outside tracked source); it records project, owner, recipe keys/payloads, upload path, attempts, IDs and verification. A private single-writer lock prevented simultaneous setup. No new reusable application implementation was installed.

Read-only setup preparation passed with the exact target/owner, nine location comparisons, five preserved objects, baseline `(15, 1, 0)` and zero existing `DEMO #17 —` posts. Uploaded the supplied `catered_food.webp` once, then set setup time to **`2026-10-11T06:09:31.722Z`**. Upload and all three listing POSTs returned confirmed **201** responses. No uncertain outcome or retry occurred. The procedure saves an attempt before POST and reconciles inventory rather than blindly repeating an uncertain request.

| Recipe / verified title | Listing ID | Verified location | Portions | Deadline UTC | Deadline America/Chicago |
| --- | --- | --- | --- | --- | --- |
| buffet / DEMO #17 — Catered lunch plates | `3b5bd28a-b265-4b16-8aba-b132ba33b1a7` | Student Center South | 5 | `2026-10-11T08:09:31.722Z` | Oct 11, 2026, 3:09:31 AM CDT |
| bowls / DEMO #17 — Vegetable rice bowls | `c2ffd3aa-cdc5-4557-b7ef-e9ccdceb95d4` | M.D. Anderson Library | 4 | `2026-10-11T08:39:31.722Z` | Oct 11, 2026, 3:39:31 AM CDT |
| fruit / DEMO #17 — Fresh fruit cups | `18031571-6251-40b5-8265-fb77e6bce971` | Science & Engineering Classroom Building (SEC) | 3 | `2026-10-11T09:09:31.722Z` | Oct 11, 2026, 4:09:31 AM CDT |

All posts are open and start their descriptions with `Synthetic demo listing. No real food is offered; pickups and any later collections are simulated.` Pickup instructions say `SIMULATED PICKUP ONLY — no real food or staffed pickup. Example meeting point: outside the main entrance of <location name>. Do not travel for this demo.` A location pin does not verify an entrance, room or actual pickup availability.

- Buffet: five example catered lunch plates with mixed entrées/sides, unknown dietary tags `[]`, ingredients/allergen notes null. Its description says `Supplied example photo; it does not show available campus food.` Only this post uses the supplied photo.
- Bowls: four fictional rice/broccoli/carrot/butter bowls; tag `["vegetarian"]`. Ingredient note names that synthetic menu. Allergen note: `Contains milk in this fictional recipe; other allergens/cross-contact unconfirmed.` No photo.
- Fruit: three fictional apple/grape/melon cups; tags `["vegan", "gluten_free"]`. Ingredient note names that synthetic menu. Allergen note: `Cross-contact unknown; no allergy-safe claim.` No photo.

Tags describe the explicitly invented menus, not facts inferred from images. The supplied tracked photo is 674036 bytes, WebP 1686×1230, SHA-256 `d5ffff8d8c0bcc332b23b1440851b648eccf1251ab5f43cab8cf57ecc4df73a1`. It was visually inspected during original preparation and its unchanged hash was checked before upload. Prior reports establish supplied-example demo use; no broader license/release or other permitted photos were found. Do not reuse it for bowls/fruit, fetch unrelated photos or generate AI images. The upload endpoint validated and reencoded it; the authenticated stored image decoded as **WebP 1600×1167**.

## Final verification

Setup acceptance passed at **`2026-10-11T06:09:40.064Z`**:

- Exactly three recipe posts, 12 available portions, verified owner/locations/labels/notes/tags/photo paths, open status and fresh +120/+150/+180 minute deadlines.
- Each ID read through authenticated listing detail and organizer inventory; all three present in standard and location-filtered feeds, supplying map inventory.
- Private buffet photo signed/read/decoded in memory without printing its signed URL. No image on the other recipes.
- Zero recipe reservation rows and zero seeded collections; final impact **(27, 1, 0)**, a setup delta of **(+12, 0, 0)**.
- Nine API locations unchanged; six owner photo objects after one new upload.

A final read-only preservation pass at **`2026-10-11T06:10:12.244Z`** verified five total listings, two visible retained reservations, unchanged saved retained listing fields and reservation records, all approved removed IDs absent, all five preserved photo IDs/timestamps unchanged, six removed candidates still absent, the new buffet object present and no recipe reservations. No accounts/profiles/locations were mutated during setup.

`git diff --check`, focused manifest/scope/timestamp consistency and read-only operator SQL checks passed. No application implementation changed, so the full lint/typecheck/test/build suite was not rerun. No browser feature verification, AI drafting/search, two-account rehearsal or mutating lifecycle/AI runner was used. #11 remains Done without repetition; #12/#13's two trimmed smoke checks remain outstanding. Deployment is separate.

## Repeating or refreshing the demo

1. Confirm the intended project and app origin, sign in normally and review the private ledger plus authenticated organizer inventory **before any POST**. Missing ledger, duplicate stable titles, changed owner or uncertain prior POST requires reconciliation; titles alone never authorize deletion. The API has no idempotency key. Use one setup writer.
2. Reuse existing future open recipe IDs when suitable. Refresh deadlines only with owner PATCH and only if **no reservation has ever existed**, including cancelled/expired history. Closing is not deletion and closed posts cannot be assumed reopenable. Do not refresh merely to make an expired card look live.
3. If replacement is needed, prepare a new exact cleanup manifest for the recipe IDs/dependencies, obtain required ownership coordination unless explicitly waived and user approval, then verify scoped database and Storage cleanup before recreating. This completed manifest does not authorize deletion of the new posts.
4. Resolve verified location IDs by exact name and compare coordinates/Maps links against `docs/verified-pickup-spots.json`. Never use fixture IDs or invent coordinates. Use fresh `new Date(Date.now() + offsetMinutes * 60000).toISOString()` deadlines and display America/Chicago time.
5. Upload matching permitted photos through authenticated `POST /api/uploads/photo`; use returned owner paths only. Reuse a recorded successful upload on resume. Inspect uncertain uploads before retry; preserve uncertain orphan objects pending separate approval.
6. Publish through authenticated `POST /api/listings` with the full frozen schema and explicit synthetic labels. Persist successful IDs immediately, read them back and reconcile uncertain outcomes through organizer inventory before any retry. No direct database inserts, AI calls, seeded reservations or simulated collections are needed.
7. Verify recipe count, portions, feeds/locations, private photo decoding, zero new reservations and impact delta. Record UTC IDs/deadlines and limitations. If a later presentation deliberately collects a portion, label it simulated and record its IDs privately for a future manifest.

## Operator artifacts and remaining limitations

- [demo-cleanup-preflight.sql](demo-cleanup-preflight.sql): historical complete administrative read-only preflight for the original manifest; it is expected to report original records missing after completion.
- [demo-photo-preflight.sql](demo-photo-preflight.sql): photo metadata diagnostic; approved removed objects now correctly appear absent.
- [demo-cleanup.sql](demo-cleanup.sql): completed destructive workflow audit artifact; **do not rerun**.
- [demo-cleanup-verify.sql](demo-cleanup-verify.sql): original retained-data/removed-ID verification; after setup its totals legitimately include the new posts.
- [demo-storage-verify.sql](demo-storage-verify.sql): candidate absence/preserved-photo check; after the new upload total photo count is six, not the cleanup-only five.

The retained collected portion is unclassified. Preservation acceptance compared saved retained fields/records, account/profile counts, location records and photo identity; original full account/profile metadata and private-backup completion were not independently verified. Database and Storage cleanup are separate transactions. The recipe deadlines are intentionally short-lived; freshness must be rechecked before a later presentation. Photo permission supports supplied-example demo use only. Physical phone, screen-reader and #12/#13 browser smoke acceptance remain outside this task's verification. Production impact partitioning and deployment remain separate work.
