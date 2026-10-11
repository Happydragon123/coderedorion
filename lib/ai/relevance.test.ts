import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoListing } from '../fixtures';
import { searchResponseSchema } from '../contracts';
import { groundedSummary } from './policy';
import { RELEVANCE_LIMITS, freshRelevantListings, relevanceCandidates, relevantListings, selectRelevant } from './relevance';

const curry = { ...demoListing, title: 'Chickpea curry', description: 'Indian-style chickpea curry with rice.' };
const alfredo = { ...demoListing, id: '00000000-0000-4000-8000-000000000098', title: 'Alfredo pasta', description: 'Pasta with creamy Alfredo sauce.' };
const pizza = { ...demoListing, id: '00000000-0000-4000-8000-000000000097', title: 'Leftover Pizza Boxes', description: 'Cheese pizza.' };

test('food selection preserves semantic matches, provider ordering and the frozen response shape', async () => {
  // Explicit synthetic unit cases. Stubbed selections verify orchestration, not
  // whether the real provider recognizes cuisine or texture associations.
  const rows = [pizza, alfredo, curry]; const before = structuredClone(rows);
  for (const [query, ids] of [['Indian food', [curry.id]], ['creamy food', [alfredo.id]], ['food', [curry.id, alfredo.id, pizza.id]]] as const) {
    const result = await selectRelevant(rows, query, async (receivedQuery, candidates) => {
      assert.equal(receivedQuery, query);
      assert.deepEqual(candidates, rows.map(({ id, title, description }) => ({ id, title, description })));
      return { listing_ids: [...ids] };
    });
    assert.deepEqual(result.map(row => row.id), ids);
    searchResponseSchema.parse({ filters: {}, listings: result, summary: groundedSummary(result) });
  }
  assert.deepEqual(rows, before);
});
test('relevance cannot inject, duplicate or restore listings excluded by deterministic retrieval', () => {
  assert.throws(() => relevantListings({ listing_ids: [curry.id] }, [alfredo, pizza]), /Unknown relevance listing/);
  assert.throws(() => relevantListings({ listing_ids: [alfredo.id, alfredo.id] }, [alfredo]));
  assert.throws(() => relevantListings({ listing_ids: [alfredo.id], summary: 'Invented dietary facts' }, [alfredo]));
  assert.deepEqual(relevantListings({ listing_ids: [] }, [pizza]), []);
});
test('comparison input is bounded and excludes photos, pickup instructions, ownership and other fields', () => {
  const row = { ...alfredo, description: 'x'.repeat(4000), photo_path: 'private/test.webp', pickup_instructions: 'Private meeting details' };
  const candidates = relevanceCandidates([row]);
  assert.deepEqual(Object.keys(candidates[0]), ['id', 'title', 'description']);
  assert.equal(candidates[0].description.length, RELEVANCE_LIMITS.descriptionCharacters);
  assert.throws(() => relevanceCandidates(Array.from({ length: RELEVANCE_LIMITS.candidates + 1 }, () => row)), /Too many/);
  assert.equal(relevanceCandidates(Array.from({ length: RELEVANCE_LIMITS.candidates }, () => row)).length, RELEVANCE_LIMITS.candidates);
});
test('empty inventory skips provider calls; comparison failures remain failures rather than all-food success', async () => {
  assert.deepEqual(await selectRelevant([], 'Indian food', async () => { throw new Error('Must not call provider'); }), []);
  await assert.rejects(selectRelevant([curry], 'Indian food', async () => { throw new Error('Provider unavailable'); }), /Provider unavailable/);
  await assert.rejects(selectRelevant([curry], 'Indian food', async () => ({ listing_ids: [alfredo.id] })), /Unknown relevance listing/);
});

test('post-comparison refresh preserves relevance order and uses fresh availability without restoring removed or changed posts', () => {
  const updatedCurry = { ...curry, available_portions: 1 };
  assert.deepEqual(freshRelevantListings([alfredo, curry], [updatedCurry, alfredo]), [alfredo, updatedCurry]);
  assert.deepEqual(freshRelevantListings([curry, alfredo], [updatedCurry]), [updatedCurry]);
  assert.deepEqual(freshRelevantListings([curry], [{ ...curry, description: 'Changed dish' }]), []);
  assert.deepEqual(freshRelevantListings([curry], [{ ...curry, title: 'Changed dish' }]), []);
  assert.deepEqual(freshRelevantListings([curry], []), []);
});
