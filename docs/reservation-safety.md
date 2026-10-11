# Own food and existing pickups

Issues #3 and #4 are implemented. No hosted SQL or food data was changed during implementation or verification.

## Behavior

- Find food and AI search cards label your own posts **Your listing** and offer **Manage listing**.
- Your listing detail offers Manage instead of Reserve. Direct reservation API calls from the owner return 403, including when using the original hosted database schema.
- Listing detail loads the listing and the caller's private pickup context before enabling a reservation. Reopening a reserved or collected listing shows its pickup status and a My pickups/history link.
- Cancelled pickups allow **Reserve again** when the listing is open, future and has stock. Reserved pickups become expired at the deadline; collected history continues to block another claim. Closing food does not invalidate an existing pickup before its deadline.
- Successful claims and conflicts refresh both inventory and pickup context. Returning focus to the detail page refreshes its context to recognize changes made in My pickups or another tab. Changing listing IDs resets the old context. Missing/failed context cannot enable Reserve.
- Pickup codes remain in the caller's private API context and My pickups; public listing responses/cards do not receive them.

## Required database migration

Run the entire [20261011030000_no_self_reservations.sql](../supabase/migrations/20261011030000_no_self_reservations.sql) once in the intended Supabase project's SQL editor after existing migrations. The migration is prepared locally and **has not been applied to the hosted database**.

The replacement `reserve_food` checks authenticated ownership after locking the listing, then preserves existing inventory/deadline checks and insertion in the same atomic transaction. This closes direct Supabase RPC attempts as well as HTTP attempts. Until installation, the new local API blocks owner claims but the original hosted RPC retains its old behavior. Existing self-reservation/demo history is preserved; no historical data or impact totals are rewritten.

The private pickup-context endpoint and reopening behavior use existing tables/views and do not require a new migration. The earlier sharing-identity migration remains a separate setup requirement for poster names.

## Verification

Run `npm run check` for lint, typecheck, default tests and build. New tests cover owner actions, existing reserved/collected pickups, cancellation, expiry, unavailable context, status replacement and private DTO boundaries.

Run isolated PostgreSQL migration/lifecycle checks with the temporary runtime documented in [account profiles](account-profiles.md):

```powershell
$identityVerifyRoot = Join-Path $env:TEMP 'campus-food-profile-sql-verification'
node scripts/verify-sharing-identity.mjs $identityVerifyRoot
```

The runner also executes [reservation-safety.local.sql](../scripts/reservation-safety.local.sql), rolling back all synthetic users, locations, food and claims. It verifies direct owner/anonymous denial, duplicate and sold-out conflicts, caller-only pickup reads, cancel/re-reserve, committed edit restrictions, closed/expired listings and exactly-once collection. This is isolated PostgreSQL with an auth/storage shim, not hosted Auth or a multi-connection race rehearsal.

Read-only HTTP verification against the local app and existing configured demo accounts/history:

```powershell
node scripts/run-pickup-context-checks.mjs http://localhost:3000
```

It checks unauthenticated denial, private cache headers, owner 403 using an already closed post, caller isolation and reopening existing pickup history. It creates no accounts, food or reservations. The default test run skips this opt-in check.

The full mutating disposable lifecycle suite (`node scripts/run-live-checks.mjs --disposable http://localhost:3000`) now needs three distinct existing accounts: the sharing owner and two collecting users. In addition to the original private settings, provide `FOOD_TEST_SECOND_STUDENT_EMAIL` and `FOOD_TEST_SECOND_STUDENT_PASSWORD` in ignored `.env.local` to test two non-owner competitors and unrelated-user code privacy. Do not run it against real food data; it leaves labeled demo history. It was not run against the hosted project for this change.

Verification passed locally: lint, typecheck, 40 default tests (five opt-in suites skipped), production build, isolated PostgreSQL acceptance, and the read-only HTTP suite using the existing two demo accounts. No confirmation email, new food, new reservation or hosted migration was created by these checks.

After migration installation, verify direct Supabase owner denial and the two-account UI flow: post → owner Manage action → another user reserves → reopen → My pickups → cancel → reopen → reserve again → collect → reopen. Check expiry and closing with an active pickup, desktop/mobile layout and keyboard focus. Hosted deployment and browser interaction remain separate verification steps.
