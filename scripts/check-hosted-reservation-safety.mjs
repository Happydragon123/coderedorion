import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createClient } from '@supabase/supabase-js';

// Read-only acceptance: only attempt claims on an existing CLOSED test-owned post.
// Both old and new lifecycle functions reject it, so this never creates a claim.
// The new function must deny ownership before the closed-listing conflict.
const env = { ...parseEnv(readFileSync('.env.local', 'utf8')), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key, 'Configure the intended Supabase project.');
function client() { return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }); }
async function login(prefix) {
  const db = client();
  const { data, error } = await db.auth.signInWithPassword({ email: env[`${prefix}_EMAIL`], password: env[`${prefix}_PASSWORD`] });
  assert.equal(error, null, 'Test-account sign-in failed.');
  return { db, user: data.user };
}
try {
  const owner = await login('FOOD_TEST_ORGANIZER');
  const other = await login('FOOD_TEST_STUDENT');
  assert.notEqual(owner.user.id, other.user.id, 'Use distinct test accounts.');
  const { data: rows, error } = await owner.db.from('listings').select('id').eq('organizer_id', owner.user.id).eq('status', 'closed').limit(1);
  assert.equal(error, null, 'Could not inspect closed test posts.');
  assert.ok(rows?.length, 'A closed test-owned post is required; this script will not create one.');
  const target = rows[0].id;
  const before = await owner.db.from('reservations').select('id', { count: 'exact', head: true }).eq('listing_id', target);
  assert.equal(before.error, null, 'Could not inspect reservation count.');
  const own = await owner.db.rpc('reserve_food', { target });
  assert.equal(own.error?.code, '42501', 'Hosted RPC must deny the listing owner, not merely return a closed-listing conflict.');
  const nonOwner = await other.db.rpc('reserve_food', { target });
  assert.equal(nonOwner.error?.code, 'P0001', 'Non-owner must still get the lifecycle conflict for closed food.');
  const anonymous = await client().rpc('reserve_food', { target });
  assert.equal(anonymous.error?.code, '42501', 'Anonymous RPC execution must be denied.');
  const after = await owner.db.from('reservations').select('id', { count: 'exact', head: true }).eq('listing_id', target);
  assert.equal(after.error, null, 'Could not inspect final reservation count.');
  assert.equal(after.count, before.count, 'Verification must not create a reservation.');
  console.log('PASS: hosted direct RPC rejects owner and anonymous claims; non-owner lifecycle checks remain intact; reservation count unchanged.');
} catch {
  // Do not print credentials, private codes, or provider response bodies.
  console.error('FAIL: hosted reservation-safety acceptance. Check test accounts, closed demo data and migration installation.');
  process.exitCode = 1;
}
