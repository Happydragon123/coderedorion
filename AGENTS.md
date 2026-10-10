# Campus Food Rescue team instructions

Read README.md, docs/contracts.md, lib/contracts.ts and campus-food-rescue-handoffs.md before implementation. Ownership is documented in docs/contracts.md. Agent 0 is foundation/integration owner; Agent 1 is sole migration owner. Contracts are reviewed and frozen at v1.0; coordinate changes with Agent 0 and Agent 1.

Use npm and the committed lockfile. Run npm run lint, npm run typecheck, npm test, and npm run build for a feature handoff. Use isolated branches/worktrees for simultaneous work. Do not edit another owner's files or install dependencies without coordinating. Preserve existing work. Never commit .env.local or provider keys.

Feature endpoints verify session with requireUser and enforce ownership/RLS; protected pages call requirePageUser. Proxy is session refresh and an initial guard, not endpoint authorization. Never silently use fixtures or bypass auth. Database mutations must follow the atomic lifecycle rules in docs/contracts.md. Verify campus coordinates before seeding.
