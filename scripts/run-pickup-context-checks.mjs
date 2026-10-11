import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';

// Read-only HTTP checks; never create demo data or send email automatically.
const base = new URL(process.argv[2] || 'http://localhost:3000');
if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new Error('Provide the local app origin.');
const local = parseEnv(readFileSync('.env.local', 'utf8'));
const env = { ...process.env, FOOD_PICKUP_CONTEXT_HTTP_TEST_RUN: '1', FOOD_HTTP_TEST_BASE_URL: base.origin,
  FOOD_TEST_URL: local.FOOD_TEST_URL || local.NEXT_PUBLIC_SUPABASE_URL,
  FOOD_TEST_KEY: local.FOOD_TEST_KEY || local.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};
for (const name of ['FOOD_TEST_ORGANIZER_EMAIL', 'FOOD_TEST_ORGANIZER_PASSWORD', 'FOOD_TEST_STUDENT_EMAIL', 'FOOD_TEST_STUDENT_PASSWORD']) env[name] = local[name] || process.env[name];
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', 'scripts/pickup-context-http.test.ts'], { env, stdio: 'inherit' });
process.exitCode = result.status ?? 1;
