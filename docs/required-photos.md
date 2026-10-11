# Required photos for new listings — task #19

October 11, 2026: implemented locally. Hosted migration and read-only installation verification **passed by user confirmation**, isolated database execution **passed by user execution**, basic publish flow and bounded failure/retry acceptance **user-confirmed**. #19 is **Done** for the scoped requirement; deployment remains separate. No agent commit, deployment, dependency installation, hosted test inventory, AI calls or lifecycle runner execution. The user installed a temporary external verification runtime; application dependencies/lockfile are unchanged.

The Share form requires a selected nonempty JPEG/PNG/WebP up to 5 MiB. It validates details and selection before upload, then awaits the authenticated decoding/reencoding + private Storage endpoint before validating the creation payload and publishing. Upload/publish stages and retry guidance are announced; form values remain intact. A confirmed attachment survives publish failure in this mounted form and is reused on explicit retry. Selecting/clearing/replacing the photo invalidates it. Upload responses with malformed paths are never treated as success. Manual publishing makes no Gemini request. Progress is stage-based, not a byte percentage.

Creation now requires a UUID-owner/UUID-filename image attachment path. Historical row/Listing DTOs, AI drafts and PATCH inputs retain nullable photos. Existing RPCs independently verify `auth.uid()`, attachment prefix and existence in `food-photos`; the additive trigger also checks all new INSERTs and attachment changes. It rejects missing/null/empty/malformed/nonexistent/foreign photos and prevents an attached photo from becoming null, including direct privileged writes. Legacy null photos remain null on unrelated edits/closure and existing reservation/history rows are untouched. Once a legacy listing adopts a photo, it cannot remove it. No NOT NULL/backfill or `created_at` exception is used. API PATCH also rejects removal before migration installation; the database trigger closes direct RPC/write bypasses only after installation. Existing row locks/lifecycle functions, RLS, private codes, and shared AI protections are unchanged.

## Hosted installation evidence

October 11, 2026: the user confirmed that the required-photo migration succeeded and all verification booleans returned true. The reported historical photo-less count is **3**, which is allowed. This is user-reported migration/read-only acceptance; no raw result table or independent agent database execution was supplied. Do not rerun the applied migration. The user subsequently confirmed the basic missing-photo/valid-photo publish flow works. The user subsequently confirmed the refreshed UI and bounded upload/publish failure/retry checks passed. The user then supplied `PASS: isolated PostgreSQL required-photo RPC/insert/update enforcement and preserved legacy history.` Isolated database behavior is now accepted on user-run test evidence. The reported blank photo-error box before submission is now conditionally rendered only when a message exists.

## Running isolated tests without an existing runtime

The user can install a temporary verification-only runtime outside the checkout (the agent has not installed dependencies):

```sh
cd /Users/ethanwu/Documents/college/senior/code_red/coderedorion
photo_sql_runtime=$(mktemp -d /tmp/cfr-photo-sql.XXXXXX)
npm install --prefix "$photo_sql_runtime" --no-save --package-lock=false @electric-sql/pglite
node scripts/verify-required-photos.mjs "$photo_sql_runtime"
```

Run these in one terminal so the variable is retained. Expected output: `PASS: isolated PostgreSQL required-photo RPC/insert/update enforcement and preserved legacy history.` This uses only in-memory PostgreSQL with local shims; no Supabase URL/credentials are needed. Report the PASS line or exact error, without secrets.

## Apply and verify

1. Review `supabase/migrations/20261011040000_required_listing_photos.sql`. Confirm the intended project and privately back up according to your normal process. This is additive to the existing food migration; never rerun/rewrite applied migrations.
2. Execute the isolated acceptance runner on a machine with an **already available** PGlite verification runtime (outside the application). It creates an in-memory database with a minimal auth/storage shim, inserts pre-migration photo-less history, applies the actual base/new migrations, and executes rollback assertions. It does not connect to Supabase or read `.env.local`:

   ```sh
   node scripts/verify-required-photos.mjs /absolute/path/to/existing-verification-runtime
   # Or include it in npm test:
   FOOD_PHOTO_LOCAL_RUNTIME=/absolute/path/to/existing-verification-runtime npm test
   ```

   That directory must contain `node_modules/@electric-sql/pglite/dist/index.js`. No runtime was available during the original agent checks; the user subsequently ran this runner successfully with an external verification runtime. Default `npm test` skips this case unless the runtime environment variable is set. The runner tests missing/null/empty/malformed/nonexistent/foreign attachment denial through RPC and direct INSERT, valid creation, RPC/direct UPDATE removal denial, foreign replacement, anonymous denial, grants/private bucket, legacy null reads/close/update and retained reservation history. Local shims do not test actual Storage bytes or hosted Auth.
3. In the intended project's Supabase SQL Editor, run the **entire** `20261011040000_required_listing_photos.sql` file once. It uses BEGIN/COMMIT. No photos, listings or history are deleted or backfilled. Do not run the local test SQL against the hosted database. Install alongside the updated app; the schema remains compatible with legacy reads, but old clients that create photo-less posts will now fail.
4. Run [required-photos-verify.sql](required-photos-verify.sql) in the same SQL Editor. Expect all permission/private-bucket/trigger booleans true, security definer true, an empty fixed search path, and compare `installed_definition` to the migration. A nonzero historical photo-less count is allowed. These read-only checks establish installation, not behavior acceptance.
5. Start the updated local application with `npm run dev` and perform the single bounded manual check below. Deployment is a separate user-operated step. Record isolated SQL result, migration application/read-only verification and manual result separately before marking #19 Done.

## One bounded manual publish check

Sign in normally and open `/share`. Manually fill one clearly labeled synthetic test listing with one portion, an existing verified location, safe simulated instructions and a future America/Chicago deadline. Do not invoke Gemini. Submit without a photo: the required-photo error must appear with no upload/listing POST. Select one permitted matching JPEG/PNG/WebP. In browser Network tools, block `/api/uploads/photo` for one attempt: the upload failure must preserve all details and create no listing. Unblock it, then block `/api/listings` for one attempt: confirm upload completes before the failed listing request. Unblock listing creation and explicitly retry: confirm **no second upload**, one successful publish and the attached image on Manage. Before retrying any uncertain real listing response, check Manage for a completed post to avoid duplicates. Optionally close that same test post; do not reserve, collect, delete or create a second post. Do not share network cookies/tokens/signed URLs. This is the user's manual acceptance, not an automated inventory runner.

## Retention and limitations

Stored photos currently persist after expiry, closure or exhausted availability. Signed URL expiry (currently five minutes in the photo UI) ends the URL's access window and **does not delete the object**. This task adds no cleanup or automatic retention.

Separate follow-up: define abandoned-upload retention, with age thresholds, uncertain-upload reconciliation and global reference checks before separately authorized Storage API cleanup. Separate follow-up: define historical attached-photo retention, protecting listing/reservation history and explaining what remains visible after closure/expiry. Never delete Storage metadata directly as a cleanup mechanism.

Confirmed attachments persist only in the mounted form; reload/navigation loses that cache. Interrupted uploads may leave unconfirmed objects, which are retained. Creation has no idempotency key: a lost response may mean a listing was created, so check Manage before retry. The existing accepted MVP boundary remains: direct owner-prefix Storage uploads can bypass endpoint decoding/reencoding, while bucket MIME/size restrictions and immutable object policies remain. The migration checks attachment existence/ownership, not visual food identity or decoded pixels for direct Storage uploads. Trusted ingestion attestation is separate work.

Opt-in lifecycle/student HTTP suites now need a preexisting successful caller-owned `FOOD_TEST_PHOTO_PATH`; this task did not run them. The AI flow runner uploads its supplied photo before manual creation (and retains its unattached-photo privacy check); it was not run.

## Local evidence

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` passed October 11, 2026. Tests: 69 total, 63 passed, six skipped, zero failed (five existing opt-in suites and the unavailable isolated PostgreSQL runtime). Focused deterministic tests cover required/malformed attachment contracts, empty/invalid selection, upload failure and explicit retry, awaiting success before creation, successful-upload reuse after publish failure, selection invalidation and nullable legacy reads/drafts/PATCH. Existing photo tests still verify signature spoofing/truncation rejection and decoding/reencoding/dimension/metadata handling. Hosted installation and bounded manual checks are user-confirmed; the isolated PostgreSQL runner subsequently passed on user execution. These are distinct from agent-run default test totals; no broader hosted runtime rejection or browser acceptance matrix is claimed.

## Changed files

- Form/state: `components/organizer/listing-form.tsx`, `components/organizer/photo-attachment.ts`.
- Shared/backend: `lib/contracts.ts`, `lib/server/food/handlers.ts`.
- Additive migration: `supabase/migrations/20261011040000_required_listing_photos.sql`.
- Focused tests: `scripts/required-photo.test.ts`, `scripts/required-photos.local.sql`, `scripts/verify-required-photos.mjs`, `scripts/contracts.test.ts`.
- Existing opt-in runner compatibility (not executed): `scripts/lifecycle.test.ts`, `scripts/student-http.test.ts`, `lib/ai/verify-flows.ts`.
- Documentation/operator checks: `docs/contracts.md`, `docs/database.md`, `docs/problems.md`, `docs/required-photos.md`, `docs/required-photos-verify.sql`.

October 11, 2026 photo-error follow-up: the user still saw the blank orange box because both local servers (ports 3000/3002) were running the older production build. Inspected the compiled Share bundle and confirmed unconditional error markup in that build. Rebuilt successfully, verified conditional error markup in the new bundle, and restarted both existing local production servers. No additional browser acceptance is claimed; refresh loads the updated build.
