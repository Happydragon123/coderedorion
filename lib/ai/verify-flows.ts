// Opt-in integration rehearsal. Uses real sessions, supplied photo and existing landmarks.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import * as c from '../contracts';
async function main() {
  if (process.argv[2] !== '--disposable') throw new Error('Explicit disposable flag required');
  process.loadEnvFile('.env.local');
  const base = new URL(process.argv[3] || 'http://localhost:3000').origin;
  const photoName = process.argv[4] || 'catered_food.webp';
  const aiInterval = Number(process.env.FOOD_TEST_AI_INTERVAL_MS || 0);
  assert.ok(Number.isFinite(aiInterval) && aiInterval >= 0 && aiInterval <= 120000, 'AI interval must be between 0 and 120000 milliseconds');
  let lastAiRequest = 0;
  async function paceAi() {
    const remaining = aiInterval - (Date.now() - lastAiRequest);
    if (remaining > 0) {
      console.log('WAIT: pacing the next Gemini request for the configured demo quota.');
      await new Promise(resolve => setTimeout(resolve, remaining));
    }
    lastAiRequest = Date.now();
  }
  const photo = new File([new Uint8Array(await readFile(photoName))], 'catered_food.webp', {type:'image/webp'});
  c.photoFileSchema.parse(photo);
  async function account(role: 'ORGANIZER' | 'STUDENT') {
    const jar = new Map<string,string>();
    const db = createServerClient(process.env.FOOD_TEST_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.FOOD_TEST_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>jar.set(name,value))}});
    const auth = await db.auth.signInWithPassword({email:process.env[`FOOD_TEST_${role}_EMAIL`]!,password:process.env[`FOOD_TEST_${role}_PASSWORD`]!});
    assert.ok(!auth.error && auth.data.user,'Configured test account sign-in failed');
    const send = (path:string, method='GET', body?:unknown) => fetch(base+path,{method,redirect:'manual',signal:AbortSignal.timeout(55000),headers:{cookie:[...jar].map(([name,value])=>`${name}=${value}`).join('; '),...(body===undefined || body instanceof FormData ? {} : {'Content-Type':'application/json'})},...(body===undefined ? {} : {body:body instanceof FormData ? body : JSON.stringify(body)})});
    return {db,send,user:auth.data.user};
  }
  const organizer = await account('ORGANIZER'), student = await account('STUDENT');
  assert.notEqual(organizer.user.id,student.user.id,'Use distinct demo accounts');
  async function checked<T>(response:Response,schema:z.ZodType<T>,status=200):Promise<T> {
    assert.equal(response.status,status,`Unexpected HTTP status for ${new URL(response.url).pathname}`);
    return schema.parse(await response.json());
  }
  const ids:string[]=[];
  const reservations:Array<{id:string; client:typeof student}>=[];
  try {
    const {locations}=await checked(await organizer.send('/api/locations'),c.locationsResponseSchema);
    const location=locations.find(row=>row.name==='Student Center South');
    assert.ok(location,'Existing verified Student Center South landmark is required');
    const payload:c.CreateListing={location_id:location.id,title:'DEMO — manual flow rehearsal',description:'Dummy integration test data. No real food or pickup.',photo_path:null,portions_total:1,pickup_instructions:'Dummy pickup at Student Center South. Test only.',pickup_deadline:new Date(Date.now()+7200000).toISOString(),dietary_tags:[],ingredients_notes:null,allergen_notes:null};
    const baseline=await checked(await organizer.send('/api/impact'),c.impactSchema);
    const create=async (body:c.CreateListing) => { const {listing}=await checked(await organizer.send('/api/listings','POST',body),c.listingResponseSchema,201); ids.push(listing.id); return listing; };
    const reserve=async (listing:c.Listing) => { const {reservation}=await checked(await student.send(`/api/listings/${listing.id}/reservations`,'POST'),c.reservationResponseSchema,201); reservations.push({id:reservation.id,client:student}); return reservation; };
    const manual=await create(payload);
    assert.ok((await checked(await student.send(`/api/listings?location_id=${location.id}`),c.listingsResponseSchema)).listings.some(row=>row.id===manual.id));
    const first=await reserve(manual);
    const cancelled=await checked(await student.send(`/api/reservations/${first.id}/cancel`,'POST'),c.reservationResponseSchema);
    assert.equal(cancelled.reservation.status,'cancelled');
    assert.equal((await checked(await student.send(`/api/listings/${manual.id}`),c.listingResponseSchema)).listing.available_portions,1);
    const second=await reserve(manual); assert.notEqual(first.id,second.id);
    await checked(await student.send(`/api/listings/${manual.id}/reservations`,'POST'),c.errorEnvelopeSchema,409);
    await checked(await student.send(`/api/listings/${manual.id}`,'PATCH',{status:'closed'}),c.errorEnvelopeSchema,403);
    await checked(await student.send(`/api/listings/${manual.id}/collect`,'POST',{pickup_code:second.pickup_code}),c.errorEnvelopeSchema,403);
    await checked(await organizer.send(`/api/listings/${manual.id}`,'PATCH',{status:'closed'}),c.listingResponseSchema);
    const collected=await checked(await organizer.send(`/api/listings/${manual.id}/collect`,'POST',{pickup_code:second.pickup_code}),c.reservationResponseSchema);
    assert.equal(collected.reservation.status,'collected');
    const duplicate=await checked(await organizer.send(`/api/listings/${manual.id}/collect`,'POST',{pickup_code:second.pickup_code}),c.reservationResponseSchema);
    assert.equal(duplicate.reservation.collected_at,collected.reservation.collected_at);
    assert.equal((await checked(await organizer.send('/api/impact'),c.impactSchema)).collected_portions,baseline.collected_portions+1);
    console.log('PASS manual: post → feed → reserve → cancel → reserve → close → collect; duplicate counts once and foreign mutations fail.');

    const race=await create({...payload,title:'DEMO — last-portion race rehearsal'});
    const raceResults=await Promise.all([student.send(`/api/listings/${race.id}/reservations`,'POST'),organizer.send(`/api/listings/${race.id}/reservations`,'POST')]);
    assert.deepEqual(raceResults.map(row=>row.status).sort(),[201,409]);
    for(let i=0;i<raceResults.length;i++) if(raceResults[i].status===201) {
      const {reservation}=c.reservationResponseSchema.parse(await raceResults[i].json());
      const client=i===0 ? student : organizer; reservations.push({id:reservation.id,client});
      await checked(await client.send(`/api/reservations/${reservation.id}/cancel`,'POST'),c.reservationResponseSchema);
    }
    console.log('PASS inventory: two distinct accounts raced for one portion; exactly one reservation succeeded.');

    if (process.argv.includes('--without-ai')) {
      const unavailable = await checked(await organizer.send('/api/ai/search','POST',{query:'food'}),c.errorEnvelopeSchema,503);
      assert.equal(unavailable.error.code,'CONFIGURATION_MISSING');
      console.log('PASS fallback: full manual lifecycle works while Gemini configuration is absent; AI reports configuration missing.');
      return;
    }

    const upload=new FormData();upload.set('photo',photo);
    const {photo_path}=await checked(await organizer.send('/api/uploads/photo','POST',upload),c.photoResponseSchema,201);
    const premature=await student.db.storage.from('food-photos').createSignedUrl(photo_path,60);
    assert.ok(premature.error,'Unattached organizer photo must be private');
    const ownerPreview=await organizer.db.storage.from('food-photos').createSignedUrl(photo_path,60);
    assert.ok(!ownerPreview.error && ownerPreview.data?.signedUrl,'Owner draft preview failed');
    console.log('PASS photo: supplied catered_food.webp uploaded; owner preview allowed and student access denied before attachment.');

    const form=new FormData();form.set('photo',photo);form.set('description','Dummy demo photo. Title: DEMO catered food. Count, landmark, instructions and deadline are unknown. Do not make dietary or allergen claims.');
    await paceAi();
    const draft=await checked(await organizer.send('/api/ai/listing-draft','POST',form),c.draftResponseSchema);
    for(const key of ['location_id','portions_total','pickup_instructions','pickup_deadline'] as const) {assert.equal(draft.draft[key],null);assert.ok(draft.missing_fields.includes(key));}
    assert.equal(draft.draft.dietary_tags,null);assert.equal(draft.draft.allergen_notes,null);
    const edited=c.createListingSchema.parse({...draft.draft,...payload,title:'DEMO — photo flow rehearsal (edited draft)',photo_path,portions_total:2});
    const listing=await create(edited);
    const studentPhoto=await student.db.storage.from('food-photos').createSignedUrl(photo_path,60);
    assert.ok(!studentPhoto.error && studentPhoto.data?.signedUrl,'Student attached-photo read denied');
    const downloaded=await fetch(studentPhoto.data.signedUrl,{signal:AbortSignal.timeout(15000)});
    assert.equal(downloaded.status,200);assert.match(downloaded.headers.get('content-type')||'',/image\/webp/);
    assert.ok((await downloaded.arrayBuffer()).byteLength>0);
    console.log('PASS draft: real image Gemini draft kept unknowns missing; edited draft published and student could read its attached photo.');

    await paceAi();
    const search=await checked(await student.send('/api/ai/search','POST',{query:'Find food at Student Center South',location_id:location.id}),c.searchResponseSchema);
    assert.ok(search.listings.some(row=>row.id===listing.id),'AI search omitted matching demo inventory');
    assert.ok(search.listings.every(row=>row.location_id===location.id && row.status==='open' && row.available_portions>0));
    assert.ok(!search.listings.some(row=>row.id===manual.id),'Closed inventory returned by search');
    for(const row of search.listings) assert.ok(!('pickup_code' in row),'Public search leaked code');
    await paceAi();
    const dietary=await checked(await student.send('/api/ai/search','POST',{query:'Find vegetarian food at Student Center South',location_id:location.id}),c.searchResponseSchema);
    assert.equal(dietary.filters.dietary_tag,'vegetarian');assert.ok(!dietary.listings.some(row=>row.id===listing.id),'Unknown dietary information matched a positive filter');
    const pickup=await reserve(listing);
    assert.ok((await checked(await student.send('/api/me/reservations'),c.reservationsResponseSchema)).reservations.some(row=>row.id===pickup.id && row.pickup_code===pickup.pickup_code));
    await checked(await organizer.send(`/api/listings/${listing.id}/collect`,'POST',{pickup_code:pickup.pickup_code}),c.reservationResponseSchema);
    assert.equal((await checked(await organizer.send('/api/impact'),c.impactSchema)).collected_portions,baseline.collected_portions+2);
    console.log('PASS AI flow: photo → reviewed/edited publish → grounded natural-language search → reserve → private pickup code → collect. Unknown tags excluded from vegetarian search.');
    for(const path of ['/api/ai/search','/api/ai/listing-draft']) await checked(await fetch(base+path,{method:'POST',redirect:'manual'}),c.errorEnvelopeSchema,401);
    console.log('PASS authorization: both AI APIs independently reject unauthenticated requests.');
  } finally {
    for(const {id,client} of reservations) await client.send(`/api/reservations/${id}/cancel`,'POST');
    for(const id of ids) await checked(await organizer.send(`/api/listings/${id}`,'PATCH',{status:'closed'}),c.listingResponseSchema);
    await Promise.all([organizer.db.auth.signOut({scope:'local'}),student.db.auth.signOut({scope:'local'})]);
    console.log('CLEANUP: created demo listings closed; test sessions signed out. Labeled test history/photo remains.');
  }
}
main().catch(error=>{console.error(error instanceof assert.AssertionError ? `FAIL: ${error.message}` : 'FAIL: flow rehearsal could not complete. Check private test configuration, connectivity and provider availability. No credentials or provider response logged.');process.exitCode=1;});
