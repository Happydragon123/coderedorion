// Explicit opt-in HTTP verification using configured disposable demo accounts.
import assert from 'node:assert/strict';
import { createServerClient } from '@supabase/ssr';
import sharp from 'sharp';
import * as c from '../contracts';
async function main() {
  if (process.argv[2] !== '--disposable') throw new Error('Explicit disposable test flag required');
  process.loadEnvFile('.env.local');
  const base = new URL(process.argv[3] || 'http://localhost:3103').origin;
  const account = async (role: 'ORGANIZER' | 'STUDENT') => {
    const jar = new Map<string, string>();
    const db = createServerClient(process.env.FOOD_TEST_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.FOOD_TEST_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { cookies: { getAll: () => [...jar].map(([name,value]) => ({name,value})), setAll: values => values.forEach(({name,value}) => jar.set(name,value)) } });
    const auth = await db.auth.signInWithPassword({ email: process.env[`FOOD_TEST_${role}_EMAIL`]!, password: process.env[`FOOD_TEST_${role}_PASSWORD`]! });
    assert.ok(!auth.error && auth.data.user, 'Test sign-in failed');
    const send = (path: string, method = 'GET', body?: unknown) => fetch(base + path, { method, redirect: 'manual', signal: AbortSignal.timeout(55000), headers: { cookie: [...jar].map(([name,value]) => `${name}=${value}`).join('; '), ...(body === undefined || body instanceof FormData ? {} : {'Content-Type':'application/json'}) }, ...(body === undefined ? {} : {body: body instanceof FormData ? body : JSON.stringify(body)}) });
    return { db, send };
  };
  const organizer = await account('ORGANIZER'), student = await account('STUDENT');
  async function checked<T>(response: Response, schema: {parse: (data: unknown) => T}, status = 200) { assert.equal(response.status, status, 'Unexpected HTTP status'); return schema.parse(await response.json()); }
  let id: string | undefined;
  try {
    for (const path of ['/share','/manage']) assert.equal((await organizer.send(path)).status,200,'Protected organizer page failed');
    for (const path of ['/api/ai/listing-draft','/api/ai/search']) await checked(await fetch(base+path,{method:'POST',redirect:'manual'}),c.errorEnvelopeSchema,401);
    const {locations} = await checked(await organizer.send('/api/locations'),c.locationsResponseSchema);
    assert.ok(locations[0], 'Verified landmark required');
    const baseline = await checked(await organizer.send('/api/impact'),c.impactSchema);
    const {listing} = await checked(await organizer.send('/api/listings','POST',{ location_id: locations[0].id, title:'DEMO — Agent 3 organizer verification',description:'Synthetic disposable inventory; no real food.',photo_path:null,portions_total:2,pickup_instructions:'Test only',pickup_deadline:new Date(Date.now()+3600000).toISOString(),dietary_tags:['vegetarian'],ingredients_notes:null,allergen_notes:null }),c.listingResponseSchema,201);
    id = listing.id;
    assert.ok((await checked(await organizer.send('/api/me/listings'),c.listingsResponseSchema)).listings.some(row => row.id===id));
    await checked(await student.send(`/api/listings/${id}`,'PATCH',{status:'closed'}),c.errorEnvelopeSchema,403);
    const {reservation} = await checked(await student.send(`/api/listings/${id}/reservations`,'POST'),c.reservationResponseSchema,201);
    await checked(await organizer.send(`/api/listings/${id}`,'PATCH',{status:'closed'}),c.listingResponseSchema);
    await checked(await student.send(`/api/listings/${id}/collect`,'POST',{pickup_code:reservation.pickup_code}),c.errorEnvelopeSchema,403);
    const first = await checked(await organizer.send(`/api/listings/${id}/collect`,'POST',{pickup_code:reservation.pickup_code}),c.reservationResponseSchema);
    const retry = await checked(await organizer.send(`/api/listings/${id}/collect`,'POST',{pickup_code:reservation.pickup_code}),c.reservationResponseSchema);
    assert.equal(first.reservation.status,'collected'); assert.equal(retry.reservation.collected_at,first.reservation.collected_at);
    assert.equal((await checked(await organizer.send('/api/impact'),c.impactSchema)).collected_portions,baseline.collected_portions+1);
    console.log('PASS: protected pages, manual post, organizer dashboard data, owner-only close, closed-listing pickup and duplicate collection.');
    const image = await sharp({create:{width:16,height:16,channels:3,background:'#fff'}}).png().toBuffer();
    const photo = new File([new Uint8Array(image)],'synthetic-test.png',{type:'image/png'});
    const upload = new FormData(); upload.set('photo',photo);
    const {photo_path} = await checked(await organizer.send('/api/uploads/photo','POST',upload),c.photoResponseSchema,201);
    assert.ok(photo_path);
    console.log('PASS: authenticated photo validation and private storage upload.');
    const invalid = new FormData(); invalid.set('photo',new File(['fake'],'fake.png',{type:'image/png'}));
    await checked(await organizer.send('/api/ai/listing-draft','POST',invalid),c.errorEnvelopeSchema,422);
    await checked(await organizer.send('/api/ai/search','POST',{query:'x',organizer_id:'injected'}),c.errorEnvelopeSchema,422);
    console.log('PASS: AI endpoints reject invalid photo content and non-contract input.');
    if (process.env.FOOD_AI_HTTP_TEST_RUN === '1') {
      const form = new FormData(); form.set('photo',photo); form.set('description','Synthetic test image. Title: Test leftovers. Count, location, instructions and deadline are unknown.');
      const draft = await checked(await organizer.send('/api/ai/listing-draft','POST',form),c.draftResponseSchema);
      for (const field of ['location_id','portions_total','pickup_deadline'] as const) { assert.equal(draft.draft[field],null); assert.ok(draft.missing_fields.includes(field)); }
      assert.equal(draft.draft.dietary_tags,null);
      const search = await checked(await organizer.send('/api/ai/search','POST',{query:'vegetarian food',location_id:locations[0].id}),c.searchResponseSchema);
      assert.equal(search.filters.dietary_tag,'vegetarian');
      assert.ok(search.listings.every(row=>row.status==='open' && row.available_portions>0 && row.dietary_tags.includes('vegetarian') && row.location_id===locations[0].id));
      assert.ok(!search.listings.some(row=>row.id===id));
      console.log('PASS: real HTTP Gemini photo draft and grounded search; closed inventory excluded.');
    }
  } finally {
    if (id) await checked(await organizer.send(`/api/listings/${id}`,'PATCH',{status:'closed'}),c.listingResponseSchema);
    await Promise.all([organizer.db.auth.signOut({scope:'local'}),student.db.auth.signOut({scope:'local'})]);
  }
}
main().catch(() => { console.error('FAIL: organizer HTTP verification did not complete. No credentials or provider output printed.'); process.exitCode=1; });
