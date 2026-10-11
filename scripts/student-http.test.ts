import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServerClient } from '@supabase/ssr';
import type { z } from 'zod';
import * as c from '../lib/contracts';

// Explicit opt-in: uses real cookie-authenticated HTTP and leaves labeled demo records.
const enabled = process.env.FOOD_HTTP_TEST_RUN === '1';
test('student HTTP flow: cookie auth, filters, 409, private pickups, cancellation and collection', { skip: !enabled }, async () => {
  const names = ['FOOD_HTTP_TEST_BASE_URL', 'FOOD_TEST_URL', 'FOOD_TEST_KEY', 'FOOD_TEST_ORGANIZER_EMAIL', 'FOOD_TEST_ORGANIZER_PASSWORD', 'FOOD_TEST_STUDENT_EMAIL', 'FOOD_TEST_STUDENT_PASSWORD'];
  assert.deepEqual(names.filter(name => !process.env[name]), [], 'Missing HTTP test configuration');
  const base = process.env.FOOD_HTTP_TEST_BASE_URL!;
  const account = async (role: 'ORGANIZER' | 'STUDENT') => {
    const jar = new Map<string, string>();
    const db = createServerClient(process.env.FOOD_TEST_URL!, process.env.FOOD_TEST_KEY!, { cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: values => values.forEach(({ name, value }) => jar.set(name, value)),
    } });
    const auth = await db.auth.signInWithPassword({ email: process.env[`FOOD_TEST_${role}_EMAIL`]!, password: process.env[`FOOD_TEST_${role}_PASSWORD`]! });
    assert.ok(!auth.error && auth.data.user, `${role} authentication failed`);
    const send = (path: string, method = 'GET', body?: unknown) => fetch(base + path, { method, redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; '), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { db, user: auth.data.user!, send };
  };
  const organizer = await account('ORGANIZER');
  const student = await account('STUDENT');
  assert.notEqual(organizer.user.id, student.user.id, 'Use distinct accounts');
  const checked = async <T>(response: Response, schema: z.ZodType<T>, expected = 200) => {
    assert.equal(response.status, expected, 'Unexpected HTTP status');
    const result = schema.safeParse(await response.json());
    assert.ok(result.success, 'HTTP response violates the shared contract');
    return result.data;
  };
  let listingId: string | undefined;
  try {
    for (const path of ['/api/listings', '/api/me/reservations', '/api/impact']) {
      const response = await fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
      const error = await checked(response, c.errorEnvelopeSchema, 401);
      assert.equal(error.error.code, 'UNAUTHENTICATED');
    }
    const { locations } = await checked(await organizer.send('/api/locations'), c.locationsResponseSchema);
    const location = locations.find(row => row.id === process.env.FOOD_TEST_LOCATION_ID) ?? locations[0];
    assert.ok(location, 'Provide a verified landmark before running the HTTP suite');
    const baseline = await checked(await organizer.send('/api/impact'), c.impactSchema);
    const { listing } = await checked(await organizer.send('/api/listings', 'POST', {
      location_id: location.id, title: 'DEMO — student HTTP integration test', description: 'Disposable test inventory; no real food or pickup.', photo_path: null, portions_total: 1,
      pickup_instructions: 'Demo only', pickup_deadline: new Date(Date.now() + 3600000).toISOString(), dietary_tags: ['vegetarian'], ingredients_notes: null, allergen_notes: null,
    }), c.listingResponseSchema, 201);
    listingId = listing.id;
    const detail = `/api/listings/${listingId}`;
    const ownerContext = await checked(await organizer.send(detail + '/pickup-context'), c.pickupContextResponseSchema);
    assert.equal(ownerContext.is_owner, true); assert.equal(ownerContext.reservation, null);
    const emptyContext = await checked(await student.send(detail + '/pickup-context'), c.pickupContextResponseSchema);
    assert.equal(emptyContext.is_owner, false); assert.equal(emptyContext.reservation, null);
    const forbiddenSelf = await checked(await organizer.send(detail + '/reservations', 'POST'), c.errorEnvelopeSchema, 403);
    assert.equal(forbiddenSelf.error.code, 'FORBIDDEN');
    const matches = await checked(await student.send(`/api/listings?location_id=${location.id}&dietary_tag=vegetarian&origin_lat=${location.latitude}&origin_lng=${location.longitude}&max_distance_m=1`), c.listingsResponseSchema);
    assert.ok(matches.listings.some(row => row.id === listingId && row.distance_m === 0));
    const excludes = await checked(await student.send('/api/listings?dietary_tag=vegan'), c.listingsResponseSchema);
    assert.ok(!excludes.listings.some(row => row.id === listingId), 'Unconfirmed dietary tags cannot match');
    const { reservation } = await checked(await student.send(detail + '/reservations', 'POST'), c.reservationResponseSchema, 201);
    assert.equal(reservation.student_id, student.user.id);
    const reservedContext = await checked(await student.send(detail + '/pickup-context'), c.pickupContextResponseSchema);
    assert.equal(reservedContext.reservation?.id, reservation.id);
    assert.equal(reservedContext.reservation?.pickup_code, reservation.pickup_code);
    for (const client of [student, organizer]) {
      const conflict = await checked(await client.send(detail + '/reservations', 'POST'), c.errorEnvelopeSchema, client === organizer ? 403 : 409);
      assert.equal(conflict.error.code, client === organizer ? 'FORBIDDEN' : 'CONFLICT');
    }
    assert.equal((await checked(await organizer.send(detail + '/pickup-context'), c.pickupContextResponseSchema)).reservation, null, 'Owner context must not reveal students\' codes');
    const soldOut = await checked(await student.send(detail), c.listingResponseSchema);
    assert.equal(soldOut.listing.available_portions, 0);
    assert.ok(!('pickup_code' in soldOut.listing));
    const own = await checked(await student.send('/api/me/reservations'), c.reservationsResponseSchema);
    assert.ok(own.reservations.every(row => row.student_id === student.user.id));
    assert.ok(own.reservations.some(row => row.id === reservation.id && row.pickup_code === reservation.pickup_code));
    const organizerPickups = await checked(await organizer.send('/api/me/reservations'), c.reservationsResponseSchema);
    assert.ok(!organizerPickups.reservations.some(row => row.id === reservation.id));
    await checked(await organizer.send(`/api/reservations/${reservation.id}/cancel`, 'POST'), c.errorEnvelopeSchema, 403);
    const cancelled = await checked(await student.send(`/api/reservations/${reservation.id}/cancel`, 'POST'), c.reservationResponseSchema);
    assert.equal(cancelled.reservation.status, 'cancelled');
    assert.equal((await checked(await student.send(detail + '/pickup-context'), c.pickupContextResponseSchema)).reservation?.status, 'cancelled');
    assert.equal((await checked(await student.send(detail), c.listingResponseSchema)).listing.available_portions, 1);
    const again = await checked(await student.send(detail + '/reservations', 'POST'), c.reservationResponseSchema, 201);
    assert.notEqual(again.reservation.id, reservation.id);
    assert.equal((await checked(await student.send(detail + '/pickup-context'), c.pickupContextResponseSchema)).reservation?.id, again.reservation.id);
    await checked(await student.send(detail + '/collect', 'POST', { pickup_code: again.reservation.pickup_code }), c.errorEnvelopeSchema, 403);
    const collected = await checked(await organizer.send(detail + '/collect', 'POST', { pickup_code: again.reservation.pickup_code }), c.reservationResponseSchema);
    assert.equal(collected.reservation.status, 'collected');
    assert.equal((await checked(await student.send(detail + '/pickup-context'), c.pickupContextResponseSchema)).reservation?.status, 'collected');
    const retry = await checked(await organizer.send(detail + '/collect', 'POST', { pickup_code: again.reservation.pickup_code }), c.reservationResponseSchema);
    assert.equal(retry.reservation.collected_at, collected.reservation.collected_at);
    const after = await checked(await organizer.send('/api/impact'), c.impactSchema);
    assert.equal(after.collected_portions, baseline.collected_portions + 1);
  } finally {
    if (listingId) await checked(await organizer.send(`/api/listings/${listingId}`, 'PATCH', { status: 'closed' }), c.listingResponseSchema);
    await Promise.all([organizer.db.auth.signOut({ scope: 'local' }), student.db.auth.signOut({ scope: 'local' })]);
  }
});
