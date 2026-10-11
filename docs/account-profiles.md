# Accounts and sharing identity

Implemented October 10, 2026. The database migration has not been applied to the hosted database.

## Test locally

Run `npm run dev`, then open `http://localhost:3000/sign-up`. Create an account with a display name, optional organization, email and matching passwords. The same account can share and pick up food. When email confirmation is enabled, use the confirmation link or the resend controls. If confirmation is disabled, signup starts a real session and saves the identity before continuing.

Open **Account** to edit the saved name/organization; clearing organization removes it. **Share food** previews the saved identity and links back to Account. Feed/search cards and listing details show the poster's current saved identity. Changes also apply to that person's existing posts. These names are user-chosen attribution, not verified affiliations. Email is displayed only on the owner's account page, never in listing attribution.

Existing accounts keep their current names (including the original `Campus member` default) until their owners edit them. The migration does not overwrite existing identities.

## Required database setup for poster names

The code includes [20261011020000_sharing_identity.sql](../supabase/migrations/20261011020000_sharing_identity.sql). Review and run the entire file once in the intended Supabase project's SQL editor, after the existing food and location migrations. This is a database administrator step, independent of pushing the local website changes. It has **not** been applied by this change.

The migration adds `food_listing_sharers(uuid[])`, an authenticated-only function that returns only listing ID, display name and organization for requested existing posts. It also initializes new profiles from validated signup metadata. Profile RLS stays self-only; the listing availability view and food lifecycle stay unchanged. Previously deployed code can continue reading the same view.

Before migration installation, Account editing and manual food flows still work with the existing schema, but listing attribution explicitly says **Sharing identity unavailable**. Only known missing-function errors permit this compatibility state; other database failures remain errors. With confirmation-enabled signup, install the migration first so the confirmed account retains its chosen initial identity. No service-role credentials or mock profiles are used.

## Email confirmation setup

Enable email/password signup in Supabase Auth. Allow the local `/auth/callback` redirect URL for the port you use, as well as the deployed callback when eventually deploying. The app passes a safe local `next` destination in the callback query string; ensure the redirect allowlist permits it. Use an appropriate development-only localhost pattern if needed, and specific HTTPS URLs for production. No Auth settings were changed here.

Default PKCE confirmation links must be opened in the browser where signup/resend occurred. The callback also accepts `token_hash` with `type=email` or `type=signup` for a configured server-side confirmation template. A template can use `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email` because this app's RedirectTo already includes `?next=...`; this supports confirmation without the original PKCE verifier. Review template/allowlist settings before changing the hosted project. Failed/expired links lead to sign-in with a resend option. Provider errors, disabled signup and email limits are shown rather than reported as success.

References: [Supabase signup](https://supabase.com/docs/reference/javascript/auth-signup), [resend](https://supabase.com/docs/reference/javascript/auth-resend), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [server-side email confirmation](https://supabase.com/docs/guides/auth/server-side/nextjs).

## Verification

`npm run check` runs lint, typecheck, default tests and build. New tests cover signup/profile validation, ownership-field rejection, safe auth returns, strict public attribution and escaped names. Default runs skip the opt-in HTTP checks.

Read-only integration with the existing private test account:

```powershell
node scripts/run-profile-checks.mjs http://localhost:3000
```

This verifies registration/resend HTML, session guards, own-profile access, invalid PATCH rejection, protected pages and sign-in/signup redirects. It does not send confirmation emails, create users or make valid profile/food writes.

For isolated PostgreSQL validation, install a temporary verification runtime outside the app (no package/lockfile changes):

```powershell
$identityVerifyRoot = Join-Path $env:TEMP 'campus-food-profile-sql-verification'
npm install --prefix $identityVerifyRoot --no-save --package-lock=false @electric-sql/pglite
node scripts/verify-sharing-identity.mjs $identityVerifyRoot
```

The runner uses in-memory PostgreSQL, a minimal Supabase auth/storage shim, the real food/location/profile migrations and [rollback acceptance checks](../scripts/sharing-identity.local.sql). Checks passed for metadata defaults/normalization, own-profile edits, other-profile denial, email denial, RPC grants, authenticated identity, requested-listing-only results, ID bounds and unchanged availability view. The shim does not test Auth email delivery or actual hosted migration installation. Never run the rollback SQL script against the hosted project.

Read-only local HTTP verification passed against the configured demo Auth/DB. Email delivery, a new-account confirmation round trip, two-account poster-name rendering after migration installation, and desktop/mobile browser interaction still need verification. Password recovery remains separate backlog work.
