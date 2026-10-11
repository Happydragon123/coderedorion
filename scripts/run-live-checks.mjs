import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

// No credentials in command arguments or output. Run only on disposable demo data.
if (process.argv[2] !== '--disposable' || !process.argv[3]) {
  console.error('Usage: node scripts/run-live-checks.mjs --disposable http://localhost:3000');
  process.exit(1);
}
try {
  const base = new URL(process.argv[3]);
  if (base.username || base.password || !['http:', 'https:'].includes(base.protocol)) throw new Error();
  const local = parseEnv(readFileSync('.env.local', 'utf8'));
  const env = { ...process.env, FOOD_TEST_RUN: '1', FOOD_HTTP_TEST_RUN: '1', FOOD_HTTP_TEST_BASE_URL: base.origin, FOOD_TEST_URL: local.FOOD_TEST_URL || local.NEXT_PUBLIC_SUPABASE_URL, FOOD_TEST_KEY: local.FOOD_TEST_KEY || local.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY };
  for (const name of ['FOOD_TEST_ORGANIZER_EMAIL', 'FOOD_TEST_ORGANIZER_PASSWORD', 'FOOD_TEST_STUDENT_EMAIL', 'FOOD_TEST_STUDENT_PASSWORD', 'FOOD_TEST_SECOND_STUDENT_EMAIL', 'FOOD_TEST_SECOND_STUDENT_PASSWORD', 'FOOD_TEST_LOCATION_ID']) env[name] = local[name] || process.env[name];
  const db = createClient(env.FOOD_TEST_URL, env.FOOD_TEST_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const auth = await db.auth.signInWithPassword({ email: env.FOOD_TEST_ORGANIZER_EMAIL, password: env.FOOD_TEST_ORGANIZER_PASSWORD });
  if (auth.error) throw new Error();
  try {
    if (!env.FOOD_TEST_LOCATION_ID) {
      const locations = await db.from('locations').select('id').order('name').limit(1);
      if (locations.error || !locations.data?.length) throw new Error();
      env.FOOD_TEST_LOCATION_ID = locations.data[0].id;
    }
  } finally { await db.auth.signOut({ scope: 'local' }); }
  // Sequential: both tests measure impact deltas in the same demo database.
  for (const file of ['scripts/lifecycle.test.ts', 'scripts/student-http.test.ts']) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', file], { env, stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
  }
} catch {
  console.error('Live checks could not initialize. Check the private test configuration, confirmed accounts, and existing verified landmarks. No credentials logged.');
  process.exitCode = 1;
}
