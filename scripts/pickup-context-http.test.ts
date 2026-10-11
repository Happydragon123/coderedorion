import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServerClient } from '@supabase/ssr';
import { errorEnvelopeSchema, listingsResponseSchema, pickupContextResponseSchema, reservationsResponseSchema } from '../lib/contracts';

// Existing demo accounts/records only. Owner POST uses a CLOSED listing: even a
// regressed guard cannot create a pickup. No successful database writes or mail.
test('pickup context HTTP: own-food denial, reopening, caller-only reservations and private caching', { skip: process.env.FOOD_PICKUP_CONTEXT_HTTP_TEST_RUN !== '1' }, async () => {
  for (const key of ['FOOD_HTTP_TEST_BASE_URL', 'FOOD_TEST_URL', 'FOOD_TEST_KEY', 'FOOD_TEST_ORGANIZER_EMAIL', 'FOOD_TEST_ORGANIZER_PASSWORD', 'FOOD_TEST_STUDENT_EMAIL', 'FOOD_TEST_STUDENT_PASSWORD']) assert.ok(process.env[key], `Missing ${key}`);
  const base = process.env.FOOD_HTTP_TEST_BASE_URL!;
  const send = (path: string, init?: RequestInit) => fetch(base + path, { ...init, redirect: 'manual', signal: AbortSignal.timeout(20000) });
  const unauthenticated = await send('/api/listings/00000000-0000-4000-8000-000000000001/pickup-context');
  assert.equal(unauthenticated.status, 401);
  assert.equal(unauthenticated.headers.get('cache-control'), 'private, no-store');
  const account = async (role: 'ORGANIZER' | 'STUDENT') => {
    const jar = new Map<string, string>();
    const db = createServerClient(process.env.FOOD_TEST_URL!, process.env.FOOD_TEST_KEY!, { cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: values => values.forEach(({ name, value }) => jar.set(name, value)),
    } });
    const auth = await db.auth.signInWithPassword({ email: process.env[`FOOD_TEST_${role}_EMAIL`]!, password: process.env[`FOOD_TEST_${role}_PASSWORD`]! });
    assert.ok(!auth.error && auth.data.user, `${role} authentication failed`);
    const headers = { cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; ') };
    return { db, userId: auth.data.user.id, get: (path: string) => send(path, { headers }), post: (path: string) => send(path, { method: 'POST', headers }) };
  };
  const owner = await account('ORGANIZER');
  const student = await account('STUDENT');
  try {
    assert.notEqual(owner.userId, student.userId);
    const ownedResponse = await owner.get('/api/me/listings');
    assert.equal(ownedResponse.status, 200);
    const owned = listingsResponseSchema.parse(await ownedResponse.json()).listings;
    const closed = owned.find(listing => listing.status === 'closed');
    assert.ok(closed, 'Provide an existing closed demo listing for the non-mutating owner-denial check');
    const denied = await owner.post(`/api/listings/${closed.id}/reservations`);
    assert.equal(denied.status, 403);
    const error = errorEnvelopeSchema.parse(await denied.json());
    assert.equal(error.error.code, 'FORBIDDEN');
    assert.equal(error.error.message, 'You cannot reserve food you posted.');
    for (const client of [owner, student]) {
      const response = await client.get(`/api/listings/${closed.id}/pickup-context?student_id=${owner.userId}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      const context = pickupContextResponseSchema.parse(await response.json());
      assert.equal(context.is_owner, client === owner);
      assert.ok(!context.reservation || context.reservation.student_id === client.userId, 'Context may expose only the caller\'s reservation');
    }
    const historyResponse = await student.get('/api/me/reservations');
    assert.equal(historyResponse.status, 200);
    const history = reservationsResponseSchema.parse(await historyResponse.json()).reservations;
    const listingIds = [...new Set(history.map(row => row.listing_id))].slice(0, 6);
    assert.ok(listingIds.length > 0, 'Provide existing demo pickup history for reopening checks');
    for (const listingId of listingIds) {
      const rows = history.filter(row => row.listing_id === listingId).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
      const expected = rows.find(row => row.status === 'reserved' || row.status === 'collected') ?? rows[0];
      for (let reopen = 0; reopen < 2; reopen++) {
        const response = await student.get(`/api/listings/${listingId}/pickup-context`);
        assert.equal(response.status, 200);
        const context = pickupContextResponseSchema.parse(await response.json());
        assert.ok(context.reservation?.id === expected.id, 'Reopening must restore the current claim or newest history');
        assert.ok(context.reservation.student_id === student.userId, 'Another person\'s pickup must remain private');
        assert.equal(context.reservation.status, expected.status);
      }
    }
  } finally { await Promise.all([owner.db.auth.signOut({ scope: 'local' }), student.db.auth.signOut({ scope: 'local' })]); }
});
