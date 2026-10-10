# Search integration and two-session rehearsal

Agent 0 reviewed and fast-forwarded `3b2db95` (student search) and its ancestor `26c748c` (Agent 3 verification) into `main`. No contracts, dependencies, migrations or environment files changed. The supplied `catered_food.webp` remains untracked.

## Runtime configuration

Both AI route handlers export `maxDuration = 60`, longer than the server-side Gemini fetch timeout of 45 seconds. The production build's `functions-config-manifest.json` records 60 seconds for both `/api/ai/search` and `/api/ai/listing-draft`. This follows [Vercel's route duration configuration](https://vercel.com/docs/functions/configuring-functions/duration). Confirm the deployed function details rather than assuming a dashboard default. Keep `GEMINI_API_KEY` and `GEMINI_MODEL` in server-only deployment configuration, never with a `NEXT_PUBLIC_` prefix.

Private-window sign-in established session cookies but its client navigation did not reliably leave the form during rehearsal. Shared sign-in now performs a full navigation to `/account` after successful authentication so the protected page reads the new cookies.

The per-user AI limiter is process-local. Shared rate limiting remains pending for multi-instance deployment.

## Local browser evidence

The integrated production app ran at `http://localhost:3110`. Safari's regular window used the organizer test account; a separate Private Browsing window used the distinct student account and independently verified its identity. No credentials or private pickup codes were printed.

- Real supplied-photo Gemini draft: the first call reported a generic provider/validation error and manual fields remained usable; an explicit retry succeeded. Location, count, instructions and deadline remained visibly missing, and dietary/ingredient/allergen claims stayed unknown.
- Organizer completed and published clearly labeled demo details through the form. Student search first verified empty results, then Refresh search returned the new listing with a grounded summary, listing ID and interpreted landmark. Its attached photo and unknown dietary information appeared in details.
- Student reserved, cancelled, confirmed availability restored from one to two, then reserved again. The replacement private pickup code differed.
- Organizer closed the listing and confirmed the student's existing pickup. The UI reported collected and cleared its code input. The closed listing and demo history remain; one simulated collection was added, not real rescued food.

`npm run check` passed: lint, typecheck, 12 tests and production build; two opt-in live suites skipped. Agent 3's earlier HTTP/race/privacy evidence remains in [its flow report](../components/organizer/FLOW_VERIFICATION.md).

## Hosted rehearsal

Integration commit `3fb8357` was pushed to `main`; GitHub's Vercel check reported successful deployment to https://coderedorion.vercel.app. Both distinct accounts signed in through separate regular/private Safari sessions and landed on Account using the new sign-in navigation.

- Organizer manually published a labeled one-portion vegetarian demo listing. Student standard filters found it. Search reported missing Gemini configuration and retained its standard-filter fallback; Back to standard results restored the prior vegetarian results.
- Student reserved, cancelled (code disappeared and availability returned to one), then reserved again with a distinct replacement code. Organizer closed the listing, confirmed collection and retried confirmation successfully. The listing remains closed.
- The real hosted HTTP runner passed manual lifecycle, owner-only mutations, idempotent collection/impact, last-portion race and supplied-photo private upload/owner preview/student denial before attachment. It stopped at the AI draft with HTTP 503 CONFIGURATION_MISSING and closed its created listings in cleanup.
- Authenticated minimal requests to both hosted AI endpoints confirmed CONFIGURATION_MISSING. The user updated settings and reported redeployment ready; the first subsequent retest still returned the same error. Hosted AI success is not yet verified.
- After deployment of `dc86b14`, both variables were present, but both endpoints returned UPSTREAM_UNAVAILABLE. Provider failures now distinguish invalid keys, denied access, unavailable models and rejected requests using fixed messages; raw provider text and credentials are never reflected.

`dc86b14` adds exact missing server-variable names to the existing authenticated error envelope and a private diagnostic command:

```sh
node --import tsx scripts/check-ai-config.ts --live https://coderedorion.vercel.app
```

It uses the existing private organizer credentials and makes two minimal provider requests, logging only HTTP/contract status or the sanitized application error. It does not publish or print model output, keys or sessions. The process-local limiter remains pending for shared infrastructure. The build explicitly records a 60-second maximum for both AI functions; the available Vercel dashboard account does not have access to this project's deployed function details.

## Latest deployed verification

Vercel reported successful deployment of `a19f106`. The authenticated minimal search returned HTTP 200 and passed the response contract. The minimal text draft returned Google's HTTP 429. Two subsequent hosted flow runs passed real supplied-photo drafting, preservation of unknown fields, reviewed publishing and authenticated access to the attached WebP. Each stopped at search with Google's HTTP 429; the final run spaced Gemini requests 70 seconds apart. This confirms usable server configuration for both AI features, but does not establish enough provider quota for the complete hosted AI lifecycle.

The private student browser also displayed the rate-limit error clearly. Back to standard results restored the open demo card. The extra browser listing was then closed without reservation or collection. Successful hosted search cards and a browser search-to-pickup sequence remain pending until Gemini quota is available. No authentication or provider checks were bypassed.

The opt-in flow runner supports pacing for low-quota demo projects:

```sh
FOOD_TEST_AI_INTERVAL_MS=70000 node --import tsx lib/ai/verify-flows.ts --disposable https://coderedorion.vercel.app catered_food.webp
```

This pacing does not guarantee available Google quota. It does not retry failures or change production rate limiting. Lint and typecheck passed after the runner change.

All test records are disposable demo activity. The rehearsals added five simulated collections during this integration; uploads/history persist. All created demo listings were closed. No environment values or supplied photo were committed. A private scan found no Gemini key in the generated browser artifacts.

## Flash-Lite follow-up

After the user changed Production to `gemini-3.5-flash-lite` and redeployed, both minimal authenticated AI requests returned HTTP 200 with valid contracts. The first full photo rehearsal caught a model-supplied campus location despite an explicitly unknown landmark. The server now always clears location, quantity, pickup instructions and deadline from AI drafts and requires organizer entry. Ingredient, allergen and dietary claims also stay unconfirmed. Title and description remain editable assistance; endpoint schemas are unchanged. A regression test covers invented pickup fields using a valid campus location. Lint, typecheck, 13 tests and production build passed, with two opt-in suites skipped.
