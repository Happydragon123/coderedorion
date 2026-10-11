import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { pickupContextResponseSchema, listingSchema, type Listing, type PickupContext, type Reservation } from '../lib/contracts';
import { demoListing, demoReservation } from '../lib/fixtures';
import { pickupState } from '../lib/pickup-state';
import { PickupActions } from '../components/student/pickup-actions';

const now = Date.parse('2030-01-01T18:30:00Z');
const context = (status: Reservation['status'] | null, owner = false): PickupContext => ({
  is_owner: owner, reservation: status ? { ...demoReservation, status, collected_at: status === 'collected' ? '2030-01-01T18:20:00Z' : null } : null,
});
const markup = (value: PickupContext | undefined, listing: Listing = demoListing, clock = now, busy = false) => renderToStaticMarkup(createElement(PickupActions, { listing, context: value, now: clock, busy, onReserve() {} }));

test('owners get Manage and never Reserve, including historical self-pickups', () => {
  for (const status of [null, 'reserved', 'collected', 'cancelled'] as const) {
    assert.equal(pickupState(demoListing, context(status, true), now).canReserve, false);
    const html = markup(context(status, true));
    assert.ok(html.includes(`/manage/${demoListing.id}`));
    assert.ok(!html.includes('<button'));
  }
});

test('reopened active and collected pickups prevent duplicate claims and link to My pickups', () => {
  for (const status of ['reserved', 'collected'] as const) {
    const value = context(status);
    assert.equal(pickupState(demoListing, value, now).canReserve, false);
    const html = markup(value);
    assert.ok(html.includes('href="/my-pickups"'));
    assert.ok(!html.includes('<button'));
    assert.ok(!html.includes(demoReservation.pickup_code), 'Detail actions do not print private codes');
  }
  assert.equal(pickupState({ ...demoListing, status: 'closed' }, context('reserved'), now).kind, 'reserved');
});

test('cancelled history permits a new claim only for open, future food with stock', () => {
  assert.equal(pickupState(demoListing, context('cancelled'), now).canReserve, true);
  assert.ok(markup(context('cancelled')).includes('Reserve again'));
  for (const listing of [{ ...demoListing, status: 'closed' as const }, { ...demoListing, available_portions: 0 }, { ...demoListing, pickup_deadline: new Date(now).toISOString() }]) {
    assert.equal(pickupState(listing, context('cancelled'), now).canReserve, false);
    assert.ok(markup(context('cancelled'), listing).includes('disabled'));
  }
  assert.ok(markup(context('cancelled'), demoListing, now, true).includes('disabled'));
});

test('clock expiry disables active pickups without changing collected or cancelled history', () => {
  const atDeadline = Date.parse(demoListing.pickup_deadline);
  assert.equal(pickupState(demoListing, context('reserved'), atDeadline).kind, 'expired');
  assert.equal(pickupState(demoListing, context('reserved'), atDeadline).canReserve, false);
  assert.ok(markup(context('reserved'), demoListing, atDeadline).includes('Pickup window ended'));
  assert.equal(pickupState(demoListing, context('collected'), atDeadline).kind, 'collected');
  assert.equal(pickupState(demoListing, context('cancelled'), atDeadline).kind, 'cancelled');
  assert.equal(pickupState(demoListing, context('expired'), now).canReserve, true, 'Historical expiry alone does not replace current listing lifecycle checks');
});

test('missing private context fails closed and fresh server status replaces old status', () => {
  assert.equal(pickupState(demoListing, undefined, now).canReserve, false);
  assert.ok(markup(undefined).includes('disabled'));
  assert.equal(pickupState(demoListing, context('reserved'), now).canReserve, false);
  assert.equal(pickupState(demoListing, context('cancelled'), now).canReserve, true);
  assert.equal(pickupState(demoListing, context('collected'), now).canReserve, false);
  assert.equal(pickupState(demoListing, context(null), now).canReserve, true);
});

test('private pickup context has a strict contract and never belongs in public listings', () => {
  assert.equal(pickupContextResponseSchema.safeParse(context('reserved')).success, true);
  for (const value of [{ is_owner: false }, { ...context(null), student_id: demoReservation.student_id }, { is_owner: 'false', reservation: null }]) assert.equal(pickupContextResponseSchema.safeParse(value).success, false);
  assert.equal(listingSchema.safeParse({ ...demoListing, reservation: demoReservation }).success, false);
  assert.equal(listingSchema.safeParse({ ...demoListing, is_owner: true }).success, false);
});
