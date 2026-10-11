# Password recovery

Implemented October 10, 2026 using the existing Supabase cookie-session integration. No new dependencies, database changes or food API contracts.

## Flow

Sign in now links to `/forgot-password`. This public page calls Supabase `resetPasswordForEmail` with the requesting origin's `/auth/callback?type=recovery` URL. Success uses neutral wording that does not disclose whether an account exists. Requests have pending feedback and a 60-second UI resend cooldown; Supabase enforces its own email limits.

The callback supports both PKCE code exchange and `token_hash` with `type=recovery`. Successful recovery always goes to `/reset-password`, ignoring arbitrary return destinations. Invalid, missing or expired recovery credentials go to `/forgot-password?error=recovery`, including when an existing account session is present. Signup/email confirmation behavior and safe return destinations remain intact. Callback responses are private and not cached.

`/reset-password` verifies the session with Supabase before rendering the password form. Guests receive a new-link action. The server action independently calls `requireUser`, validates matching passwords (8–256 characters without trimming), and updates only that authenticated account through `auth.updateUser`. Provider password-policy errors remain visible. Success clears the fields, focuses the confirmation and offers Account; the user remains signed in. Supabase may additionally require reauthentication under the project's password-security policy.

## Supabase configuration

Allow `/auth/callback?type=recovery` for the local origins/ports used and the deployed HTTPS origin in Auth → URL Configuration. Confirm the reset-email template preserves the requested redirect. The standard `{{ .ConfirmationURL }}` template uses PKCE; open its email in the browser that requested the link.

For a reviewed cross-device template using direct OTP verification, the requested RedirectTo already includes `?type=recovery`, so the link can be:

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}">Reset your password</a>
```

Review the redirect allowlist and template before enabling this on the hosted project. On October 10, 2026, the user approved and saved callback allowlist entries for recovery and safe signup returns at the deployed origin and localhost ports 3000/3001. The reset-email template was inspected and uses the standard ConfirmationURL. Email templates and SMTP settings were not changed. Existing Supabase settings continue to govern delivery and password requirements.

Reference: [Supabase password authentication and recovery](https://supabase.com/docs/guides/auth/passwords), [resetPasswordForEmail](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail).

## Verification

Lint, typecheck, 44 default tests (five opt-in suites skipped), and production build passed. Added focused tests cover email validation, password matching/limits/whitespace, callback intent and accessible form output.

```sh
node scripts/check-password-recovery.mjs http://localhost:3001
```

This read-only runner uses ignored `.env.local` and the existing organizer test account. It verifies the sign-in recovery link, request form, guest reset-page guard, authenticated password form, invalid PKCE/OTP links, private callback responses, and unchanged signup error returns. It passed against the local production build. No mail was sent and no password was changed.

The user explicitly excluded the real-email/link/password-change rehearsal from project scope. Delivery, a successful emailed recovery callback and password update were therefore not exercised end to end. Callback allowlist/template configuration is now verified. Deployment and an actual emailed round trip remain unverified; the current Vercel account cannot access the project. Existing global form styles, focus and reduced-motion rules are reused.

Safari local production check: after direct sign-out, the recovery link opened the request form at 320px with guest navigation and no clipped inputs/buttons. No request was submitted.
