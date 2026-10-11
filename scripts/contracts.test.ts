import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createListingSchema, listingFiltersSchema, listingSchema, reservationSchema } from '../lib/contracts';
import { demoListing, demoReservation } from '../lib/fixtures';
test('public listing excludes pickup codes and private reservation data', () => {
  assert.equal(listingSchema.safeParse({ ...demoListing, pickup_code: 'PRIVATE' }).success, false);
  assert.equal(reservationSchema.safeParse(demoReservation).success, true);
});
test('create input cannot inject organizer identity or invalid inventory', () => {
  const { location_id, title, description, portions_total, pickup_instructions, pickup_deadline, dietary_tags, ingredients_notes, allergen_notes } = demoListing;
  const input = { photo_path: `${demoListing.organizer_id}/00000000-0000-4000-8000-000000000006.webp`, location_id, title, description, portions_total, pickup_instructions, pickup_deadline, dietary_tags, ingredients_notes, allergen_notes };
  assert.equal(createListingSchema.safeParse(input).success, true);
  assert.equal(createListingSchema.safeParse({ ...input, organizer_id: demoListing.organizer_id }).success, false);
  assert.equal(createListingSchema.safeParse({ ...input, portions_total: 0 }).success, false);
});
test('distance filters require paired coordinates and preserve zero', () => {
  assert.deepEqual(listingFiltersSchema.parse({ origin_lat: '0', origin_lng: '0', max_distance_m: '500' }), { origin_lat: 0, origin_lng: 0, max_distance_m: 500 });
  for (const input of [{ max_distance_m: 500 }, { origin_lat: 40 }, { origin_lat: '', origin_lng: 0 }, { dietary_tag: 'unknown' }]) assert.equal(listingFiltersSchema.safeParse(input).success, false);
});
