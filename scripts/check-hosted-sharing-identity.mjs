import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createClient } from '@supabase/supabase-js';

// Read-only: existing demo accounts/posts, no emails, signup, or profile writes.
const env = { ...parseEnv(readFileSync('.env.local', 'utf8')), ...process.env };
const client = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
let stage = 'sign-in';
try {
  const owner = client(), other = client();
  const users = [];
  for (const [db, prefix] of [[owner, 'FOOD_TEST_ORGANIZER'], [other, 'FOOD_TEST_STUDENT']]) {
    const result = await db.auth.signInWithPassword({ email: env[`${prefix}_EMAIL`], password: env[`${prefix}_PASSWORD`] });
    assert.equal(result.error, null);
    users.push(result.data.user);
  }
  assert.notEqual(users[0].id, users[1].id);
  stage = 'existing owner posts';
  const { data: posts, error } = await owner.from('listings').select('id').eq('organizer_id', users[0].id).limit(2);
  assert.equal(error, null); assert.ok(posts.length);
  const profile = await owner.from('profiles').select('display_name,organization_name').eq('id', users[0].id).single();
  assert.equal(profile.error, null);
  stage = 'public attribution';
  const result = await other.rpc('food_listing_sharers', { targets: posts.map(post => post.id) });
  assert.equal(result.error, null); assert.equal(result.data.length, posts.length);
  for (const row of result.data) {
    assert.deepEqual(Object.keys(row).sort(), ['display_name', 'listing_id', 'organization_name']);
    assert.equal(row.display_name, profile.data.display_name);
    assert.equal(row.organization_name, profile.data.organization_name);
  }
  stage = 'profile privacy';
  const hidden = await other.from('profiles').select('*').eq('id', users[0].id);
  assert.equal(hidden.error, null); assert.equal(hidden.data.length, 0);
  const denied = await client().rpc('food_listing_sharers', { targets: posts.map(post => post.id) });
  assert.ok(denied.error);
  console.log('PASS: two-account hosted attribution matches saved identity; foreign profiles and guest access remain private. No data changed.');
} catch {
  console.error(`FAIL: hosted sharing identity (${stage}). Check project setup and test accounts.`);
  process.exitCode = 1;
}
