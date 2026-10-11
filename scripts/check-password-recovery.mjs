import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createServerClient } from '@supabase/ssr';

// Real, read-only HTTP checks. Never send reset emails or change passwords.
const base = new URL(process.argv[2] || 'http://127.0.0.1:3001');
assert.ok(['http:', 'https:'].includes(base.protocol) && !base.username && !base.password);
const env = { ...parseEnv(readFileSync('.env.local', 'utf8')), ...process.env };
const send = (path, headers) => fetch(new URL(path, base), { headers, redirect: 'manual', signal: AbortSignal.timeout(20000) });
const callbackTarget = response => new URL(response.headers.get('location'), base);
const jar = new Map();
const db = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { cookies: {
  getAll: () => [...jar].map(([name, value]) => ({ name, value })),
  setAll: values => values.forEach(({ name, value }) => jar.set(name, value)),
} });
let stage = 'sign-in recovery link';
try {
  const signIn = await send('/sign-in');
  assert.equal(signIn.status, 200);
  assert.ok((await signIn.text()).includes('href="/forgot-password"'));
  stage = 'reset-email form';
  const forgot = await send('/forgot-password');
  assert.equal(forgot.status, 200);
  assert.ok((await forgot.text()).includes('name="email"'));
  stage = 'anonymous password-page guard';
  const missingSession = await send('/reset-password');
  assert.equal(missingSession.status, 200);
  const missingHtml = await missingSession.text();
  assert.ok(missingHtml.includes('Request a reset link'));
  assert.ok(!missingHtml.includes('name="confirm_password"'), 'Do not render password form to anonymous visitors.');
  for (const query of ['type=recovery', 'type=recovery&token_hash=invalid-test-token&next=https://evil.invalid', 'type=recovery&code=invalid-test-code']) {
    stage = 'invalid callback: ' + query.split('&')[1]?.split('=')[0];
    const failure = await send(`/auth/callback?${query}`);
    assert.equal(failure.status, 307);
    assert.equal(failure.headers.get('cache-control'), 'private, no-store');
    const target = callbackTarget(failure);
    assert.equal(target.origin, base.origin);
    assert.equal(target.pathname, '/forgot-password');
    assert.equal(target.searchParams.get('error'), 'recovery');
  }
  stage = 'signup callback regression';
  const signupFailure = await send('/auth/callback?type=signup&next=/share');
  assert.equal(callbackTarget(signupFailure).pathname, '/sign-in');
  assert.equal(callbackTarget(signupFailure).searchParams.get('next'), '/share');
  stage = 'test-account authentication';
  const { error } = await db.auth.signInWithPassword({ email: env.FOOD_TEST_ORGANIZER_EMAIL, password: env.FOOD_TEST_ORGANIZER_PASSWORD });
  assert.equal(error, null, 'Existing test-account authentication failed.');
  const headers = { cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; ') };
  stage = 'authenticated password form';
  const reset = await send('/reset-password', headers);
  assert.equal(reset.status, 200);
  const html = await reset.text();
  for (const name of ['password', 'confirm_password']) assert.ok(html.includes(`name="${name}"`));
  stage = 'invalid link with existing session';
  const staleLink = await send('/auth/callback?type=recovery', headers);
  assert.equal(callbackTarget(staleLink).pathname, '/forgot-password', 'Invalid links must stay invalid even with an existing session.');
  console.log('PASS: recovery pages, guest guard, authenticated password form, invalid recovery/PKCE links, private callback responses and unchanged signup returns. No email sent or password changed.');
} catch {
  console.error(`FAIL: password-recovery HTTP checks at ${stage}. Verify the running app and test-account configuration.`);
  process.exitCode = 1;
} finally { await db.auth.signOut({ scope: 'local' }); }
