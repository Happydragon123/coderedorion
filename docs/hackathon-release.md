# Hackathon release checks — October 10, 2026

This is the current integration handoff. Earlier AI/mobile reports remain dated evidence, not an outstanding implementation queue. See [the trimmed tracker](problems.md) for the remaining demo work.

## Changes

- Applied the existing reviewed `20261011020000_sharing_identity.sql` migration to the configured Supabase project after checking that the project matched `.env.local` and that the function was absent. The SQL editor reported success. No migration source, table shape, lifecycle rule or dependency changed.
- Added read-only `scripts/check-hosted-sharing-identity.mjs`. Existing separate demo accounts verified that attribution matches the saved name/organization, returns only approved fields, keeps foreign profiles private and denies guest access. It creates no data and sends no email.
- Simplified navigation to four primary entries. Both sharing and collecting remain available to the same account. Members use More for Home, Manage food, Impact, Account and direct Sign out. Sign-out includes pending/error feedback and clears the current session with `scope: 'local'`, then redirects and refreshes server state. Account sign-out uses the same scope.
- Preserved the pre-existing password-recovery implementation and other uncommitted work.
- Trimmed the hackathon gate: exhaustive security retesting, production email operations, large-history tools, automatic photo renewal, destructive demo resets and production impact partitioning are follow-ups. Published-listing editing is optional after the demo; publishing/closing/collection remain the required flow. Core session, ownership, RLS and atomic inventory checks remain unchanged.

## Authentication configuration

The user explicitly approved saving these seven additional redirect entries after automatic approval review requested exact authorization:

```text
https://coderedorion.vercel.app/auth/callback?type=recovery
https://coderedorion.vercel.app/auth/callback?next=**
http://localhost:3000/auth/callback?type=recovery
http://localhost:3000/auth/callback?next=**
http://localhost:3001/auth/callback
http://localhost:3001/auth/callback?type=recovery
http://localhost:3001/auth/callback?next=**
```

The saved dashboard showed all seven entries and 13 total entries. Existing redirects and Site URL were preserved. Patterns are scoped to the app callback; the callback still validates safe return destinations. The reset-email preview uses `{{ .ConfirmationURL }}`; no template or SMTP setting was changed. Matching behavior follows [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

Actual signup email delivery/confirmation remains unverified. The real emailed password-reset/password-change rehearsal remains excluded by the user. No email was sent and no password changed during this work.

## Verification

- `npm run check`: lint, typecheck, 44 passing tests, five opt-in tests skipped, production build passed.
- `node scripts/check-hosted-sharing-identity.mjs`: hosted two-account attribution/privacy passed.
- `node scripts/run-profile-checks.mjs http://localhost:3001`: local production account/session/profile HTTP acceptance passed.
- `node scripts/check-password-recovery.mjs http://localhost:3001`: guest/session guards, recovery forms, invalid callbacks, private responses and unchanged signup returns passed.
- Safari with an existing authenticated local session: member navigation and menu, live home-map availability/attribution, feed sharer names and own-post Manage action verified. A 390px responsive viewport showed the four primary links and More menu fitting without clipping. Direct sign-out in the final build returned to Sign in and guest links. At 320px, guest navigation and the recovery request form fit without clipping. No reset request was submitted. This is browser emulation, not a physical-device test.

## Release limitation

The current Vercel account cannot access `happydragon123s-projects/coderedorion`: its project URL reports 404 and offers signing in as another user. The visible team has no existing projects. No duplicate project was created, no deployment was performed, and no commit/push was made. Local changes remain in the shared checkout for review. Deployment and hosted browser checks require the existing project's owner/access.

Once the existing deployment is accessible: deploy the reviewed code, verify signup confirmation and hosted session transitions, then rehearse the two-account demo once. Avoid repeating live mutation suites without a changed behavior to verify; preserve existing posts and demo history.
