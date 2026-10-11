// Explicit hosted rehearsal: at most one search interpretation and one text draft.
import assert from 'node:assert/strict';
import { createServerClient } from '@supabase/ssr';
import * as c from '../contracts';
async function main() {
  assert.equal(process.argv[2], '--disposable');
  process.loadEnvFile('.env.local');
  const base = new URL(process.argv[3]).origin;
  async function account(role: 'ORGANIZER' | 'STUDENT') {
    const jar = new Map<string, string>();
    const db = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>jar.set(name,value))}});
    assert.equal((await db.auth.signInWithPassword({email:process.env[`FOOD_TEST_${role}_EMAIL`]!,password:process.env[`FOOD_TEST_${role}_PASSWORD`]!})).error,null);
    return {db,send:(path:string,body?:unknown,method=body===undefined?'GET':'POST')=>fetch(base+path,{method,signal:AbortSignal.timeout(55000),headers:{cookie:[...jar].map(([name,value])=>`${name}=${value}`).join('; '),...(body!==undefined && !(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)})};
  }
  const organizer=await account('ORGANIZER'), student=await account('STUDENT');
  let listingId:string|undefined, reservationId:string|undefined, leaseId:string|undefined;
  async function checked<T>(response:Response,schema:{parse:(v:unknown)=>T},status=200) {assert.equal(response.status,status,`Unexpected HTTP status on ${new URL(response.url).pathname}`);return schema.parse(await response.json());}
  try {
    for(const path of ['/api/ai/search','/api/ai/listing-draft']) assert.equal((await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
    console.log('PASS: unauthenticated AI rejected');
    const admission=await organizer.db.rpc('ai_admit');assert.equal(admission.error,null);assert.equal(admission.data.allowed,true);leaseId=admission.data.lease_id;
    const denied=await organizer.send('/api/ai/search',{query:'reliability concurrency check'});await checked(denied,c.errorEnvelopeSchema,429);assert.equal(denied.headers.get('X-AI-Rate-Limit-Source'),'app');assert.ok(Number(denied.headers.get('Retry-After'))>=1);
    await checked(await organizer.send('/api/listings'),c.listingsResponseSchema);
    await organizer.db.rpc('ai_release',{p_lease_id:leaseId});leaseId=undefined;
    console.log('PASS: shared admission cooldown and standard feed fallback');
    const {locations}=await checked(await organizer.send('/api/locations'),c.locationsResponseSchema);assert.ok(locations.length);
    const payload={location_id:locations[0].id,title:'DEMO shared cache verification',description:'Disposable verification only; no real food.',photo_path:null,portions_total:1,pickup_instructions:'Test only',pickup_deadline:new Date(Date.now()+3600000).toISOString(),dietary_tags:['vegan'],ingredients_notes:null,allergen_notes:null};
    const {listing}=await checked(await organizer.send('/api/listings',payload),c.listingResponseSchema,201);listingId=listing.id;
    const query={query:'vegan food',location_id:listing.location_id};
    const first=await checked(await organizer.send('/api/ai/search',query),c.searchResponseSchema);assert.ok(first.listings.some(row=>row.id===listingId));
    const {reservation}=await checked(await student.send(`/api/listings/${listingId}/reservations`,{}),c.reservationResponseSchema,201);reservationId=reservation.id;
    const second=await checked(await organizer.send('/api/ai/search',query),c.searchResponseSchema);assert.deepEqual(second.filters,first.filters);assert.ok(!second.listings.some(row=>row.id===listingId));assert.ok(!second.summary.includes(listingId));
    console.log('PASS: repeated interpretation retrieves fresh sold-out inventory and summary');
    const form=new FormData();form.set('description','DEMO text draft. Location, count, pickup instructions and deadline are unknown.');
    const {draft}=await checked(await organizer.send('/api/ai/listing-draft',form),c.draftResponseSchema);
    for(const key of ['location_id','portions_total','pickup_instructions','pickup_deadline','dietary_tags','ingredients_notes','allergen_notes'] as const) assert.equal(draft[key],null);
    console.log('PASS: draft uses shared admission and preserves manual pickup fields');
  } finally {
    if(leaseId) await organizer.db.rpc('ai_release',{p_lease_id:leaseId});
    if(reservationId) await checked(await student.send(`/api/reservations/${reservationId}/cancel`,{}),c.reservationResponseSchema);
    if(listingId) await checked(await organizer.send(`/api/listings/${listingId}`,{status:'closed'},'PATCH'),c.listingResponseSchema);
    await Promise.all([organizer.db.auth.signOut({scope:'local'}),student.db.auth.signOut({scope:'local'})]);
  }
}
main().catch(()=>{console.error('Reliability rehearsal failed; no credentials, model output or pickup codes logged.');process.exitCode=1;});
