import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServerClient } from '@supabase/ssr';
import { profileResponseSchema, listingsResponseSchema } from '../lib/contracts';

// Read-only real HTTP checks: no signup mail, valid profile writes or food mutations.
test('account HTTP: registration/resend pages, own profile, auth guards and safe returns', { skip: process.env.FOOD_PROFILE_HTTP_TEST_RUN !== '1' }, async () => {
  for (const key of ['FOOD_HTTP_TEST_BASE_URL', 'FOOD_TEST_URL', 'FOOD_TEST_KEY', 'FOOD_TEST_ORGANIZER_EMAIL', 'FOOD_TEST_ORGANIZER_PASSWORD']) assert.ok(process.env[key], `Missing ${key}`);
  const base = process.env.FOOD_HTTP_TEST_BASE_URL!;
  const send = (path: string, init?: RequestInit) => fetch(base + path, { ...init, redirect: 'manual', signal: AbortSignal.timeout(20000) });
  const signup = await send('/sign-up');
  assert.equal(signup.status, 200);
  const html = await signup.text();
  for (const name of ['display_name', 'organization_name', 'email', 'password', 'confirm_password']) assert.ok(html.includes(`name="${name}"`));
  const resend = await send('/sign-up?confirm=1');
  assert.equal(resend.status, 200); assert.ok((await resend.text()).includes('Resend confirmation email'));
  const callback = await send('/auth/callback?next=https://evil.test');
  assert.equal(callback.status, 307);
  const returnUrl = new URL(callback.headers.get('location')!, base);
  assert.equal(returnUrl.origin, base); assert.equal(returnUrl.pathname, '/sign-in'); assert.equal(returnUrl.searchParams.get('next'), '/account');
  const protectedPage = await send('/share');
  assert.equal(protectedPage.status, 307);
  assert.equal(new URL(protectedPage.headers.get('location')!, base).searchParams.get('next'), '/share');
  for (const method of ['GET', 'PATCH']) {
    const response = await send('/api/me/profile', { method, ...(method === 'PATCH' ? { headers: { 'Content-Type': 'application/json' }, body: '{}' } : {}) });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
  const jar = new Map<string, string>();
  const db = createServerClient(process.env.FOOD_TEST_URL!, process.env.FOOD_TEST_KEY!, { cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: values => values.forEach(({ name, value }) => jar.set(name, value)),
  } });
  const signedIn = await db.auth.signInWithPassword({ email: process.env.FOOD_TEST_ORGANIZER_EMAIL!, password: process.env.FOOD_TEST_ORGANIZER_PASSWORD! });
  assert.ok(!signedIn.error && signedIn.data.user, 'Test authentication failed');
  const headers = { cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; ') };
  try {
    const own = await send('/api/me/profile', { headers });
    assert.equal(own.status, 200);
    assert.equal(own.headers.get('cache-control'), 'private, no-store');
    const { profile } = profileResponseSchema.parse(await own.json());
    assert.equal(profile.id, signedIn.data.user.id);
    for (const changes of [{ id: signedIn.data.user.id }, { email: 'private@example.invalid' }, { role: 'admin' }, { display_name: '  ' }]) {
      const invalid = await send('/api/me/profile', { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ display_name: profile.display_name, organization_name: profile.organization_name, ...changes }) });
      assert.equal(invalid.status, 422, 'Invalid profile request must fail before writing');
      assert.equal(invalid.headers.get('cache-control'), 'private, no-store');
    }
    for (const path of ['/account', '/share']) assert.equal((await send(path, { headers })).status, 200);
    for (const path of ['/sign-in?next=/share', '/sign-up?next=/share']) {
      const response = await send(path, { headers });
      assert.equal(response.status, 307); assert.equal(new URL(response.headers.get('location')!, base).pathname, '/share');
    }
    const listings = await send('/api/listings', { headers });
    assert.equal(listings.status, 200);
    listingsResponseSchema.parse(await listings.json());
  } finally { await db.auth.signOut({ scope: 'local' }); }
});
