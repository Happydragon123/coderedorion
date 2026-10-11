import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoListing, demoLocation } from '../fixtures';
import { groundedSummary } from './policy';
import { selectRelevant } from './relevance';
import { interpret, interpretationKey, withLease, type InterpretationStore } from './reliability';
import type { ListingFilters } from '../contracts';
function store(): InterpretationStore {
  const values = new Map<string, ListingFilters>(); const pending = new Set<string>();
  return {
    async claim(key) { if (values.has(key)) return { status: 'hit', filters: values.get(key) }; if (pending.has(key)) return { status: 'pending' }; pending.add(key); return { status: 'claimed', claim_id: key }; },
    async complete(key, _token, filters) { values.set(key, filters); pending.delete(key); },
    async abandon(key) { pending.delete(key); },
  };
}
const busy = () => new Error('busy');
test('cached interpretation avoids provider work while summaries reflect fresh inventory', async () => {
  const shared = store(); let calls = 0;
  const generate = async () => { calls++; return { dietary_tag: 'vegan' }; };
  for (let i = 0; i < 2; i++) assert.deepEqual(await interpret({query:'vegan food'}, [demoLocation], 'model', shared, generate, busy), { dietary_tag: 'vegan' });
  assert.equal(calls, 1);
  assert.match(groundedSummary([{...demoListing,available_portions:1}]), /1 available portions/);
  assert.match(groundedSummary([]), /No matching food found/);
});
test('identity includes caller origin, location, model, landmarks and policy; normalizes spaces', () => {
  const key = interpretationKey({query:'vegan food'}, [demoLocation], 'm');
  assert.equal(key, interpretationKey({query:'  vegan   food '}, [demoLocation], 'm'));
  for (const alternate of [interpretationKey({query:'vegan food',origin:{latitude:1,longitude:2}},[demoLocation],'m'),interpretationKey({query:'vegan food',location_id:demoLocation.id},[demoLocation],'m'),interpretationKey({query:'vegan food'},[demoLocation],'other'),interpretationKey({query:'vegan food'},[{...demoLocation,name:'changed'}],'m')]) assert.notEqual(key, alternate);
});
test('relative dates, numeric queries and any deadline filters never persist', async () => {
  for (const [query, result] of [['food tomorrow', {}], ['food in 2 hours', {}], ['food', { pickup_before: '2030-01-01T00:00:00Z' }]] as const) {
    let calls = 0; const shared = store();
    for (let i = 0; i < 2; i++) await interpret({query}, [demoLocation], 'm', shared, async () => {calls++; return result;}, busy);
    assert.equal(calls,2);
  }
});
test('concurrent callers deduplicate and failure relinquishes claim', async () => {
  const shared = store(); let finish!: (value: unknown) => void;
  const first = interpret({query:'food'}, [demoLocation], 'm', shared, () => new Promise(resolve => { finish = resolve; }), busy);
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(interpret({query:'food'},[demoLocation],'m',shared,async()=>{throw new Error('unexpected provider');},busy), /busy/);
  finish({}); await first;
  const failed = store();
  await assert.rejects(interpret({query:'food'},[demoLocation],'m',failed,async()=>({unsupported:true}),busy));
  assert.deepEqual(await interpret({query:'food'},[demoLocation],'m',failed,async()=>({}),busy), {});
});
test('cache hits are revalidated against current policy', async () => {
  const invalid: InterpretationStore = { async claim(){return {status:'hit',filters:{location_id:'00000000-0000-4000-8000-000000000099'}};},async complete(){},async abandon(){} };
  await assert.rejects(interpret({query:'food'},[demoLocation],'m',invalid,async()=>({}),busy), /Unknown location/);
});

test('leases release on success and failure, cooldown precedes release and storage errors preserve original failure', async () => {
  const events: string[] = [];
  assert.equal(await withLease(async()=>42,async()=>{events.push('release');},async()=>{events.push('cooldown');}),42);
  assert.deepEqual(events,['release']); events.length=0;
  const failure = new Error('provider quota');
  await assert.rejects(withLease(async()=>{throw failure;},async()=>{events.push('release');throw new Error('storage');},async()=>{events.push('cooldown');throw new Error('storage');}),error=>error===failure);
  assert.deepEqual(events,['cooldown','release']);
});

test('cached filters do not cache food relevance or stale listing selections', async () => {
  // Deterministic test-only stubs, not Gemini behavior or production inventory.
  const shared = store(); let interpretationCalls = 0; let relevanceCalls = 0;
  const input = { query: 'creamy food' };
  const alfredo = { ...demoListing, title: 'Alfredo pasta', description: 'Pasta with cream sauce.' };
  for (const rows of [[alfredo], []]) {
    const filters = await interpret(input, [demoLocation], 'm', shared, async () => { interpretationCalls++; return {}; }, busy);
    assert.deepEqual(filters, {});
    const matches = await selectRelevant(rows, input.query, async () => { relevanceCalls++; return { listing_ids: [alfredo.id] }; });
    assert.deepEqual(matches, rows);
    if (rows.length) assert.ok(groundedSummary(matches).includes(alfredo.id));
    else assert.ok(!groundedSummary(matches).includes(alfredo.id));
  }
  assert.equal(interpretationCalls, 1);
  assert.equal(relevanceCalls, 1); // Empty fresh inventory never reaches the provider.
  const replacement = { ...alfredo, id: '00000000-0000-4000-8000-000000000098', title: 'Creamy mushroom soup' };
  await interpret(input, [demoLocation], 'm', shared, async () => { throw new Error('Unexpected interpretation'); }, busy);
  const matches = await selectRelevant([replacement], input.query, async () => { relevanceCalls++; return { listing_ids: [replacement.id] }; });
  assert.equal(relevanceCalls, 2);
  assert.deepEqual(matches, [replacement]);
  assert.ok(!groundedSummary(matches).includes(alfredo.id));
});
