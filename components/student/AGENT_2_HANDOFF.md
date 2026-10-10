# Agent 2 student interface handoff

Branch: `agent-2-student-interface`. Changes are restricted to `app/(student)`, `components/student`, `components/map`, and `lib/geo.ts`. No dependencies, contracts, migrations, shared navigation/styles, or environment files were changed. The group layout calls `requirePageUser`; APIs continue to authorize every request independently.

## Delivered

- `/listings`: real food feed, location/dietary/deadline/distance filters, landmark origin, optional device geolocation, loading/error/empty states and refresh.
- `/listings/[id]`: validated ID, listing details, private signed photo, organizer-confirmed dietary tags and honest unknown ingredients/allergens, one-portion server reservation, closed/sold-out/expired guards and conflict handling.
- `/my-pickups`: only the signed-in account's reservation endpoint, private codes for active pickups, cancellation, history, effective expiry and refresh after mutation. Missing listing details do not hide history or prevent cancellation; codes are withheld until the deadline can be checked.
- `/impact`: project-wide posted, active reserved and collected totals. Only collected portions are described as rescued.
- Map/list toggle: dynamically loaded Leaflet, grouped landmark pins, visible provider attribution, tile failure notice, persistent usable list, validated external directions and straight-line miles. Coordinates are always latitude then longitude.

## Setup and integration

Use existing Supabase configuration, applied migration and confirmed test accounts. Populate landmarks only after independent coordinate verification. Map tiles require both `NEXT_PUBLIC_MAP_TILE_URL` and `NEXT_PUBLIC_MAP_ATTRIBUTION` at build time and an authorized provider. No default tile service or fabricated locations are used. The shared header is unchanged; Agent 0 can add `/listings` to shared navigation. Student navigation links all four flows from within the route group.

`app/api/ai/search` does not exist in this checkout, so no AI search control was enabled. Agent 3 must deliver that endpoint before integration; deterministic filters work independently. The deployment has not been updated by this branch.

## Validation

`npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` passed. The default test run passed five checks and skipped the opt-in live lifecycle suite; the previously reported live result was not rerun. Geo regression checks run separately with `node --import tsx --test components/map/geo.test.ts` because the frozen npm test script includes only `scripts/*.test.ts`. Browser unauthenticated `/listings` redirected to sign-in. After the user signed in, Safari verified the real empty feed, configured Student Center South landmark, private expired/collected pickup history, expired listing details with a disabled reserve button, honest unknown dietary/allergen fields, valid directions, and impact totals (5 posted / 0 active reserved / 1 collected, from lifecycle test records). Browser review caught and fixed a directions-helper crash caused by passing the full location DTO into a strict coordinate schema; a regression check now covers DTO metadata.

## Remaining verification

Active reservation/cancellation and 409 UI behavior still require an open test listing; none is available in the signed-in feed. Mobile layout, map provider rendering/tile failure, geolocation denial and deployed browser workflows remain unverified. Map configuration is absent locally, and the disabled-map/list fallback was verified. Database ownership/lifecycle checks remain backend-owned. Client clocks update every ten seconds; database time remains authoritative for mutations. A device-timezone deadline input is converted to ISO UTC; displayed pickup deadlines use America/Chicago. Codes never appear in public cards or map popups. Private photo URLs expire after five minutes; reload details to renew them.
