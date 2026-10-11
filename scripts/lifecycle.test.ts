import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';

// Explicitly opt in against a disposable migrated project. No fixtures or secrets logged.
const names = ['FOOD_TEST_URL','FOOD_TEST_KEY','FOOD_TEST_ORGANIZER_EMAIL','FOOD_TEST_ORGANIZER_PASSWORD','FOOD_TEST_STUDENT_EMAIL','FOOD_TEST_STUDENT_PASSWORD','FOOD_TEST_SECOND_STUDENT_EMAIL','FOOD_TEST_SECOND_STUDENT_PASSWORD','FOOD_TEST_LOCATION_ID','FOOD_TEST_PHOTO_PATH'];
const enabled = process.env.FOOD_TEST_RUN === '1';
test('real PostgreSQL lifecycle: race, privacy, ownership, cancellation, close, expiry and exactly-once collection', { skip: !enabled }, async () => {
  const missing = names.filter(name => !process.env[name]);
  assert.deepEqual(missing, [], `Missing test configuration: ${missing.join(', ')}`);
  const make = () => createClient(process.env.FOOD_TEST_URL!,process.env.FOOD_TEST_KEY!, { auth: { persistSession:false,autoRefreshToken:false } });
  const organizer = make(), student = make(), secondStudent = make(), anonymous = make();
  const authO = await organizer.auth.signInWithPassword({email:process.env.FOOD_TEST_ORGANIZER_EMAIL!,password:process.env.FOOD_TEST_ORGANIZER_PASSWORD!});
  const authS = await student.auth.signInWithPassword({email:process.env.FOOD_TEST_STUDENT_EMAIL!,password:process.env.FOOD_TEST_STUDENT_PASSWORD!});
  const authSecond = await secondStudent.auth.signInWithPassword({email:process.env.FOOD_TEST_SECOND_STUDENT_EMAIL!,password:process.env.FOOD_TEST_SECOND_STUDENT_PASSWORD!});
  assert.equal(authO.error,null,'Organizer authentication failed'); assert.equal(authS.error,null,'Student authentication failed'); assert.equal(authSecond.error,null,'Second student authentication failed');
  assert.equal(new Set([authO.data.user!.id, authS.data.user!.id, authSecond.data.user!.id]).size,3);
  const rpc = async (client: typeof student,name:string,args:Record<string,unknown>={}) => {
    const result = await client.rpc(name,args); assert.equal(result.error,null,`RPC ${name} failed`); return result.data;
  };
  const create = (deadline = new Date(Date.now()+60000).toISOString()) => rpc(organizer,'create_food_listing',{payload:{ location_id:process.env.FOOD_TEST_LOCATION_ID,title:'Lifecycle integration test',description:'Disposable test; not real rescue inventory.',photo_path:process.env.FOOD_TEST_PHOTO_PATH,portions_total:1,pickup_instructions:'Test only',pickup_deadline:deadline,dietary_tags:[],ingredients_notes:null,allergen_notes:null }});
  const ids:string[]=[];
  try {
    const id = await create(); ids.push(id);
    const self = await organizer.rpc('reserve_food',{target:id});
    assert.equal(self.error?.code,'42501','Direct database calls reject the organizer claiming their own food');
    const race = await Promise.all([student.rpc('reserve_food',{target:id}),secondStudent.rpc('reserve_food',{target:id})]);
    assert.equal(race.filter(r=>!r.error).length,1,'One remaining portion must have one winner');
    const winner = race[0].error ? secondStudent : student;
    const loser = winner === student ? secondStudent : student;
    const claim = race.find(r=>!r.error)!.data;
    const view = await loser.from('listing_availability').select('available_portions').eq('id',id).single();
    assert.equal(view.error,null); assert.equal(view.data!.available_portions,0,'Hidden reservations still reduce availability');
    assert.ok((await winner.rpc('reserve_food',{target:id})).error,'Duplicate cannot consume inventory');
    const privateRows = await loser.from('reservations').select('*').eq('listing_id',id);
    assert.equal(privateRows.error,null); assert.deepEqual(privateRows.data,[],'Unrelated student cannot see pickup codes');
    assert.ok((await anonymous.rpc('food_impact')).error,'Anonymous aggregate is forbidden');
    assert.ok((await student.rpc('patch_food_listing',{target:id,payload:{title:'Unauthorized'}})).error);
    assert.ok((await student.rpc('collect_food',{target:id,code:claim.pickup_code})).error);
    assert.ok((await loser.rpc('cancel_food',{target:claim.id})).error);
    assert.ok((await organizer.rpc('patch_food_listing',{target:id,payload:{pickup_deadline:new Date(Date.now()+120000).toISOString()}})).error);
    const cancelled = await rpc(winner,'cancel_food',{target:claim.id}); assert.equal(cancelled.status,'cancelled');
    assert.equal((await rpc(winner,'cancel_food',{target:claim.id})).status,'cancelled');
    const reClaim = await rpc(student,'reserve_food',{target:id});
    assert.notEqual(reClaim.id,claim.id);
    await rpc(organizer,'patch_food_listing',{target:id,payload:{status:'closed'}});
    assert.ok((await organizer.rpc('reserve_food',{target:id})).error,'Closed listing rejects reservations');
    const before = await rpc(organizer,'food_impact');
    const collected = await rpc(organizer,'collect_food',{target:id,code:reClaim.pickup_code});
    assert.equal(collected.status,'collected');
    const retry = await rpc(organizer,'collect_food',{target:id,code:reClaim.pickup_code});
    assert.equal(retry.collected_at,collected.collected_at);
    const after = await rpc(organizer,'food_impact'); assert.equal(after.collected_portions,before.collected_portions+1);
    assert.ok((await student.rpc('cancel_food',{target:reClaim.id})).error);
    const privacy = await create(); ids.push(privacy);
    await rpc(secondStudent,'reserve_food',{target:privacy});
    const hidden = await student.from('private_reservations').select('*').eq('listing_id',privacy);
    assert.equal(hidden.error,null); assert.deepEqual(hidden.data,[], 'Unrelated student sees no codes');
    const committed = await create(); ids.push(committed);
    await rpc(organizer,'patch_food_listing',{target:committed,payload:{portions_total:2}});
    await rpc(student,'reserve_food',{target:committed});
    await rpc(secondStudent,'reserve_food',{target:committed});
    assert.ok((await organizer.rpc('patch_food_listing',{target:committed,payload:{portions_total:1}})).error, 'Cannot reduce total below commitments');
    const expiry = await create(new Date(Date.now()+3000).toISOString()); ids.push(expiry);
    const expClaim = await rpc(student,'reserve_food',{target:expiry});
    await new Promise(resolve=>setTimeout(resolve,3200));
    const expiredRows = await student.from('private_reservations').select('*').eq('id',expClaim.id).single();
    assert.equal(expiredRows.data!.status,'expired');
    assert.ok((await organizer.rpc('collect_food',{target:expiry,code:expClaim.pickup_code})).error);
    assert.ok((await organizer.rpc('reserve_food',{target:expiry})).error);
    assert.equal((await rpc(student,'cancel_food',{target:expClaim.id})).status,'expired');
  } finally {
    for (const id of ids) await organizer.rpc('patch_food_listing',{target:id,payload:{status:'closed'}});
    await Promise.all([organizer.auth.signOut({scope:'local'}),student.auth.signOut({scope:'local'}),secondStudent.auth.signOut({scope:'local'})]);
  }
});
