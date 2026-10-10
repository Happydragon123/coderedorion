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

`npm run check` passed: lint, typecheck, 11 tests and production build; two opt-in live suites skipped. Agent 3's earlier HTTP/race/privacy evidence remains in [its flow report](../components/organizer/FLOW_VERIFICATION.md). A hosted rehearsal must verify this new search UI separately.
