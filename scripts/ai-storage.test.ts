import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';

// Opt in only against the disposable migrated project. No Gemini calls or food writes.
test('shared AI storage: admission race, ownership, release, cache dedup and isolation', { skip: process.env.FOOD_TEST_AI_STORAGE_RUN !== '1' }, async () => {
  const required = ['FOOD_TEST_URL', 'FOOD_TEST_KEY', 'FOOD_TEST_ORGANIZER_EMAIL', 'FOOD_TEST_ORGANIZER_PASSWORD', 'FOOD_TEST_STUDENT_EMAIL', 'FOOD_TEST_STUDENT_PASSWORD'];
  assert.deepEqual(required.filter(key => !process.env[key]), [], 'Missing private test configuration');
  const make = () => createClient(process.env.FOOD_TEST_URL!, process.env.FOOD_TEST_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const first = make(), second = make(), other = make(), anonymous = make();
  for (const [client, prefix] of [[first, 'ORGANIZER'], [second, 'ORGANIZER'], [other, 'STUDENT']] as const) {
    const result = await client.auth.signInWithPassword({ email: process.env[`FOOD_TEST_${prefix}_EMAIL`]!, password: process.env[`FOOD_TEST_${prefix}_PASSWORD`]! });
    assert.equal(result.error, null, 'Test authentication failed');
  }
  const rpc = async (client: typeof first, name: string, args: Record<string, unknown> = {}) => {
    const result = await client.rpc(name, args);
    assert.equal(result.error, null, `${name} failed`);
    return result.data;
  };
  const leases: string[] = [];
  const key = randomBytes(32).toString('hex');
  const claims: { client: typeof first; token: string }[] = [];
  try {
    assert.ok((await anonymous.rpc('ai_admit')).error, 'Anonymous admission must fail');
    assert.ok((await anonymous.rpc('ai_cache_claim', { p_cache_key: key })).error, 'Anonymous cache access must fail');
    assert.ok((await first.from('ai_runtime_config').update({ project_per_day: 100000 }).eq('singleton', true)).error, 'Clients cannot loosen budgets');
    const race = await Promise.all([rpc(first, 'ai_admit'), rpc(second, 'ai_admit')]);
    assert.equal(race.filter(value => value.allowed).length, 1, 'Default one-user concurrency must span clients');
    const winner = race.find(value => value.allowed)!;
    leases.push(winner.lease_id);
    assert.ok(race.find(value => !value.allowed)!.retry_after_seconds >= 1);
    await rpc(other, 'ai_release', { p_lease_id: winner.lease_id });
    assert.equal((await rpc(second, 'ai_admit')).allowed, false, 'Foreign release cannot free a slot');
    await rpc(first, 'ai_release', { p_lease_id: winner.lease_id });
    const next = await rpc(second, 'ai_admit');
    assert.equal(next.allowed, true, 'Failure cleanup permits a new admission');
    leases.push(next.lease_id);
    await rpc(second, 'ai_release', { p_lease_id: next.lease_id });
    const claimRace = await Promise.all([rpc(first, 'ai_cache_claim', { p_cache_key: key }), rpc(second, 'ai_cache_claim', { p_cache_key: key })]);
    assert.equal(claimRace.filter(value => value.status === 'claimed').length, 1);
    assert.equal(claimRace.filter(value => value.status === 'pending').length, 1);
    const owned = claimRace.find(value => value.status === 'claimed')!;
    claims.push({ client: first, token: owned.claim_id });
    assert.equal(await rpc(other, 'ai_cache_complete', { p_cache_key: key, p_claim_id: owned.claim_id, p_filters: { dietary_tag: 'vegan' } }), false);
    assert.equal(await rpc(first, 'ai_cache_complete', { p_cache_key: key, p_claim_id: owned.claim_id, p_filters: { dietary_tag: 'vegan' } }), true);
    const hit = await rpc(second, 'ai_cache_claim', { p_cache_key: key });
    assert.equal(hit.status, 'hit');
    assert.deepEqual(hit.filters, { dietary_tag: 'vegan' });
    const isolated = await rpc(other, 'ai_cache_claim', { p_cache_key: key });
    assert.equal(isolated.status, 'claimed', 'Another user cannot read an interpretation');
    claims.push({ client: other, token: isolated.claim_id });
    await rpc(other, 'ai_cache_abandon', { p_cache_key: key, p_claim_id: isolated.claim_id });
    const reclaimed = await rpc(other, 'ai_cache_claim', { p_cache_key: key });
    assert.equal(reclaimed.status, 'claimed');
    assert.notEqual(reclaimed.claim_id, isolated.claim_id);
    claims.push({ client: other, token: reclaimed.claim_id });
    if (process.env.FOOD_TEST_AI_STORAGE_EXTENDED_RUN === '1') {
      // Administrator fixture: clean admissions, project_concurrency=1, lease_seconds=60;
      // remaining defaults unchanged. This does not alter configuration itself.
      const projectRace = await Promise.all([rpc(first, 'ai_admit'), rpc(other, 'ai_admit')]);
      assert.equal(projectRace.filter(value => value.allowed).length, 1, 'Two distinct users share the project slot');
      const denied = projectRace.find(value => !value.allowed)!;
      assert.equal(denied.reason, 'project_concurrency');
      const projectWinner = projectRace.find(value => value.allowed)!;
      const owner = projectRace[0].allowed ? first : other;
      const contender = owner === first ? other : first;
      // Intentionally abandon this admitted lease, simulating process termination.
      // The cache claim above is also left unfinished. Neither holds a transaction.
      await new Promise(resolve => setTimeout(resolve, 60000));
      await new Promise(resolve => setTimeout(resolve, 1000));
      const recovered = await rpc(contender, 'ai_admit');
      assert.equal(recovered.allowed, true, 'An expired project lease frees capacity');
      await rpc(contender, 'ai_release', { p_lease_id: recovered.lease_id });
      await rpc(owner, 'ai_release', { p_lease_id: projectWinner.lease_id });
      const expiredClaim = await rpc(other, 'ai_cache_claim', { p_cache_key: key });
      assert.equal(expiredClaim.status, 'claimed', 'Expired interpretation claim can be replaced');
      assert.notEqual(expiredClaim.claim_id, reclaimed.claim_id);
      claims.push({ client: other, token: expiredClaim.claim_id });
      assert.equal(await rpc(other, 'ai_cache_complete', { p_cache_key: key, p_claim_id: reclaimed.claim_id, p_filters: {} }), false, 'Stale claim cannot publish');
      await rpc(other, 'ai_cache_abandon', { p_cache_key: key, p_claim_id: reclaimed.claim_id });
      assert.equal((await rpc(other, 'ai_cache_claim', { p_cache_key: key })).status, 'pending', 'Stale abandon cannot remove replacement');
      // Contender has one fresh admission; releasing slots must not refund attempts.
      for (let attempt = 1; attempt < 6; attempt++) {
        const admitted = await rpc(contender, 'ai_admit');
        assert.equal(admitted.allowed, true);
        await rpc(contender, 'ai_release', { p_lease_id: admitted.lease_id });
      }
      const exhausted = await rpc(contender, 'ai_admit');
      assert.equal(exhausted.allowed, false);
      assert.equal(exhausted.reason, 'user_budget');
      assert.ok(exhausted.retry_after_seconds >= 1);
    }

  } finally {
    for (const lease of leases) await first.rpc('ai_release', { p_lease_id: lease });
    for (const claim of claims) await claim.client.rpc('ai_cache_abandon', { p_cache_key: key, p_claim_id: claim.token });
    await Promise.all([first, second, other].map(client => client.auth.signOut({ scope: 'local' })));
  }
});
