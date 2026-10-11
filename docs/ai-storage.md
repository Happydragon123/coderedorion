# Shared AI storage migration

Agent 1 owns `supabase/migrations/202610100002_ai_reliability.sql`. Apply once after the food migration to the intended Supabase project using the authenticated dashboard or CLI. This migration introduces no credentials, dependencies, inventory changes or campus seeds. It is transactional. Application AI requests fail closed until it is installed; manual food operations remain independent.

The administrator-only `public.ai_runtime_config` singleton is the authoritative configuration. Authenticated clients cannot read or change it. Defaults: user 6 admissions/minute, 100/day, 1 active lease; project 12/minute, 450/day, 2 active leases; request leases 60 seconds; provider cooldown 3600 seconds; interpretation TTL 300 seconds; total cache cap 1000 entries. Day budgets reset at UTC midnight; they are application safety budgets, not an assertion about the provider's quota/reset time. Token spending is not measured. Tune budgets downward to account for other applications using the provider project.

Database administrators may update settings, for example:

```sql
update public.ai_runtime_config
set project_per_minute = 10, project_per_day = 400,
    cache_ttl_seconds = 300
where singleton = true;
```

All RPCs derive identity from `auth.uid()`, revoke PUBLIC/anonymous execution, and use a fixed empty search path. All tables have RLS enabled and no client table privileges or policies. Request admission and cache decisions use separate database advisory transaction locks. Transactions end before provider work; the application holds a UUID lease, not a database transaction. Admission rows remain through the UTC day to count usage even after release. Old rows are removed on admission, retaining any still-active lease across midnight. Failed provider calls still count as attempts. Crashes recover by expiry.

RPC interfaces:

- `ai_admit()` returns `{allowed, lease_id?, retry_after_seconds, reason?}`. Reasons distinguish user/project concurrency, minute budgets, daily budgets and provider cooldown.
- `ai_release(p_lease_id uuid)` returns void; another user's lease is unaffected. Release is idempotent.
- `ai_provider_cooldown(p_lease_id uuid)` requires an active owned admission and sets the fixed configured project cooldown. Returns the actual shared remaining cooldown in whole seconds. Call before releasing a lease on provider 429. This trusts authenticated admitted callers to report failures; a user with an active lease can intentionally impose this bounded cooldown. No provider secret or service role is introduced.
- `ai_cache_claim(p_cache_key text)` accepts lowercase SHA256 hex only and returns `{status:'hit',filters}` or `{status:'claimed',claim_id}` or `{status:'pending',retry_after_seconds}`. Cache identity is user-isolated. Claims expire after 60 seconds. A full cache evicts the earliest-expiring completed interpretation; if every entry is an active claim, callers wait rather than evicting a claim.
- `ai_cache_complete(p_cache_key text,p_claim_id uuid,p_filters jsonb)` returns whether the active owned claim was completed. It accepts only small object payloads with allowlisted filter keys. Time-sensitive pickup_before is rejected. Full DTO/policy validation remains mandatory in the AI application on write and every hit. Clients can only poison their own cache. Never cache a response containing listings, reservations, signed URLs or codes.
- `ai_cache_abandon(p_cache_key text,p_claim_id uuid)` deletes only the caller's unfinished claim, with matching token. An expired/stale token cannot overwrite or abandon a newer claim.

The application owns normalized/hash-only identities and temporal-query exclusions. Never use cache hits to skip current session-authorized inventory reads. Database content bounds are 4096 serialized bytes/interpretation and at most the configured total entries. There is no periodic cleanup requirement for correctness; expired entries are reclaimed on the next claim. Administrative changes reducing the cap below existing count require expiry or administrator pruning before new claims can be admitted.

`FOOD_TEST_AI_STORAGE_RUN=1 npm test` runs the opt-in two-account database test with the private `FOOD_TEST_URL`, `FOOD_TEST_KEY`, organizer/student email/password environment already used by lifecycle tests. It consumes three app admissions at most, makes no Gemini calls and writes no inventory. Use a disposable project with untouched default concurrency and enough remaining budgets; do not run alongside app traffic. Completed test cache data naturally expires. Default tests skip this suite.

The migration has not been applied remotely during this handoff. Hosted Supabase integration and reliability checks remain required after authorized deployment. Local PostgreSQL execution is now verified as described below.

Extended acceptance coverage is available with both `FOOD_TEST_AI_STORAGE_RUN=1` and `FOOD_TEST_AI_STORAGE_EXTENDED_RUN=1`. Use a fresh disposable database with the administrator changing only `project_concurrency=1` before the run; keep user concurrency1/minute6, project minute12 and lease60. With only two users and the default project concurrency2, user concurrency masks project-slot denial, hence this explicit fixture. The script never changes administrator configuration. The extended scenario races two different users for one project slot, deliberately leaves the winning lease and a cache claim uncompleted, waits 60 seconds then one additional second, verifies expiry recovery and stale-token safety, and verifies released attempts still exhaust the user minute budget. It uses at most ten app admissions and no provider calls. Restore the project concurrency setting afterward through the administrator. The opt-in suite assumes fresh daily counters and no concurrent app traffic.


## Local PostgreSQL runtime evidence

On 2026-10-10, Docker Desktop was started and a throwaway official `postgres:16-alpine` container was run without publishing a host port. No external credentials or service role were used. A minimal `auth.users` table and `auth.uid()` reading `request.jwt.claim.sub`, plus `anon`/`authenticated` roles, modeled the Supabase identity boundary. The entire AI migration compiled and applied successfully. `scripts/ai-storage.local.sql` then passed transaction-rollback assertions covering identity checks/function grants/table privilege denial, foreign release protection, lease expiry, user/project minute and daily limits, actual configured provider cooldown, claim expiry, stale token protection, cache isolation/deduplication, temporal filter rejection and bounded capacity.

Separate simultaneous psql processes running as `authenticated` also passed three races: two distinct users with project concurrency1 produced one admission and one project denial; two sessions for one user produced one admission and one user denial; two identical cache requests produced one claim and one pending response. These are real PostgreSQL checks of the migration, using local identity stubs; they do not validate Supabase session cookies, PostgREST or deployed configuration. The container was stopped/removed after verification.

To repeat the SQL assertions, prepare a throwaway PostgreSQL16 database, install the migration, and provide the two UUIDs/auth stubs described at the top of the SQL file. Execute with database administrator privileges and `psql -v ON_ERROR_STOP=1 -f scripts/ai-storage.local.sql`. Never run this administrator fixture against production: it deliberately truncates limiter/cache state inside a rollback transaction.
