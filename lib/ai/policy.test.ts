import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { demoListing, demoLocation } from '../fixtures';
import { draftSchema, listingFiltersSchema, type ListingDraft } from '../contracts';
import { groundedFilters, groundedSummary, reviewedDraft } from './policy';
const empty: ListingDraft = { location_id: null, title: null, description: null, photo_path: null, portions_total: null, pickup_instructions: null, pickup_deadline: null, dietary_tags: null, ingredients_notes: null, allergen_notes: null };
test('draft unknowns remain missing and AI cannot confirm dietary or allergen claims', () => {
  const result = reviewedDraft({ ...empty, title: 'Leftovers', location_id: '00000000-0000-4000-8000-000000000099', dietary_tags: ['vegan'], allergen_notes: 'Safe for everyone', photo_path: 'invented' });
  assert.equal(result.draft.location_id, null);
  assert.equal(result.draft.dietary_tags, null);
  assert.equal(result.draft.allergen_notes, null);
  assert.equal(result.draft.photo_path, null);
  assert.deepEqual(result.missing_fields, ['location_id','description','portions_total','pickup_instructions','pickup_deadline']);
});
test('draft requires organizer entry even when the model invents valid pickup details', () => {
  const result = reviewedDraft({ ...empty, location_id: demoLocation.id, portions_total: 12, pickup_instructions: 'Meet at the entrance', pickup_deadline: new Date(Date.now() + 3600000).toISOString(), ingredients_notes: 'Invented ingredients' });
  for (const key of ['location_id', 'portions_total', 'pickup_instructions', 'pickup_deadline', 'ingredients_notes'] as const) assert.equal(result.draft[key], null);
  for (const key of ['location_id', 'portions_total', 'pickup_instructions', 'pickup_deadline'] as const) assert.ok(result.missing_fields.includes(key));
});
test('search uses caller origin and landmark and rejects invented IDs and extra filters', () => {
  assert.throws(() => groundedFilters({ location_id: '00000000-0000-4000-8000-000000000099' }, {query:'food'}, [demoLocation]));
  assert.throws(() => groundedFilters({ title: 'pizza' }, {query:'pizza'}, [demoLocation]));
  assert.deepEqual(groundedFilters({ origin_lat: 45, origin_lng: 40, max_distance_m: 500 }, {query:'nearby'}, [demoLocation]), {});
  assert.deepEqual(groundedFilters({ origin_lat: 45, origin_lng: 40, max_distance_m: 500, dietary_tag: 'vegan' }, {query:'nearby',origin:{latitude:0,longitude:0},location_id:demoLocation.id}, [demoLocation]), { origin_lat:0,origin_lng:0,max_distance_m:500,dietary_tag:'vegan',location_id:demoLocation.id });
});
test('grounded summary reflects only returned inventory and stays within contract limits', () => {
  assert.match(groundedSummary([]), /No matching food found/);
  const summary = groundedSummary([demoListing]);
  assert.ok(summary.includes(demoListing.id));
  assert.ok(summary.includes(`${demoListing.available_portions} available portions`));
  assert.ok(groundedSummary(Array.from({length:200}, () => demoListing)).length <= 2000);
});
test('Gemini schemas serialize without unrepresentable preprocessors', () => {
  for (const schema of [draftSchema, listingFiltersSchema]) assert.ok(z.toJSONSchema(schema, {io:'output'}));
});

test('relevance summary stays grounded and brief without clarification lectures', () => {
  const pizza = { ...demoListing, title: 'Leftover Pizza Boxes', dietary_tags: [] };
  const before = structuredClone(pizza);
  const summary = groundedSummary([pizza]);
  assert.match(summary, /1 possible food match based on listing titles and descriptions/);
  assert.ok(summary.includes(pizza.id));
  assert.doesNotMatch(summary, /healthy|clarif|nutrition|match the interpreted filters/i);
  assert.deepEqual(pizza, before);
  const empty = groundedSummary([]);
  assert.match(empty, /No matching food found/);
  assert.match(empty, /standard filters/);
  assert.doesNotMatch(empty, /healthy|clarif|nutrition/i);
});
test('long relevant-inventory summaries remain within the response contract', () => {
  const rows = Array.from({ length: 200 }, () => ({ ...demoListing, title: 'x'.repeat(160), location: { ...demoLocation, name: 'y'.repeat(120) } }));
  const summary = groundedSummary(rows);
  assert.ok(summary.length <= 2000);
  assert.match(summary, /200 possible food matches/);
  assert.ok(summary.includes(demoListing.id));
  assert.ok(summary.endsWith('Review listing details and organizer-confirmed dietary information before reserving.'));
});
