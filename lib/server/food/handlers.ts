import 'server-only';
import { NextResponse } from 'next/server';
import * as c from '@/lib/contracts';
import { requireUser } from '@/lib/server/auth';
import { apiError, readJson, ApiError } from '@/lib/server/api';
import { databaseError, listing, listings, reservations, rpc } from '@/lib/data/food';
export type Context = { params: Promise<{ id?: string }> };
export function handler(action: (request: Request, context: Context) => Promise<NextResponse>) {
  return async (request: Request, context: Context) => { try { return await action(request, context); } catch (error) { return apiError(error); } };
}
export const locationsGet = handler(async () => {
  const { supabase } = await requireUser(); const { data, error } = await supabase.from('locations').select('*').order('name'); databaseError(error);
  return NextResponse.json(c.locationsResponseSchema.parse({ locations: data }));
});
export const listingsGet = handler(async request => {
  const { supabase } = await requireUser(); const params = new URL(request.url).searchParams;
  if ([...params.keys()].some(key => params.getAll(key).length > 1)) throw new ApiError(422, 'INVALID_INPUT', 'Duplicate query parameters.');
  const filters = c.listingFiltersSchema.parse(Object.fromEntries(params));
  return NextResponse.json(c.listingsResponseSchema.parse({ listings: await listings(supabase, filters) }));
});
export const listingGet = handler(async (_, context) => {
  const { supabase } = await requireUser(); const id = c.idSchema.parse((await context!.params).id);
  return NextResponse.json(c.listingResponseSchema.parse({ listing: await listing(supabase, id) }));
});
export const listingPost = handler(async request => {
  const { supabase } = await requireUser(); const input = await readJson(request, c.createListingSchema);
  const id = c.idSchema.parse(await rpc(supabase, 'create_food_listing', { payload: input }));
  return NextResponse.json(c.listingResponseSchema.parse({ listing: await listing(supabase, id) }), { status: 201 });
});
export const listingPatch = handler(async (request, context) => {
  const { supabase } = await requireUser(); const id = c.idSchema.parse((await context!.params).id);
  await rpc(supabase, 'patch_food_listing', { target: id, payload: await readJson(request, c.patchListingSchema) });
  return NextResponse.json(c.listingResponseSchema.parse({ listing: await listing(supabase, id) }));
});
export const reservePost = handler(async (_, context) => {
  const { supabase } = await requireUser(); const id = c.idSchema.parse((await context!.params).id);
  return NextResponse.json(c.reservationResponseSchema.parse({ reservation: await rpc(supabase, 'reserve_food', { target: id }) }), { status: 201 });
});
export const cancelPost = handler(async (_, context) => {
  const { supabase } = await requireUser(); const id = c.idSchema.parse((await context!.params).id);
  return NextResponse.json(c.reservationResponseSchema.parse({ reservation: await rpc(supabase, 'cancel_food', { target: id }) }));
});
export const collectPost = handler(async (request, context) => {
  const { supabase } = await requireUser(); const id = c.idSchema.parse((await context!.params).id); const input = await readJson(request, c.collectSchema);
  return NextResponse.json(c.reservationResponseSchema.parse({ reservation: await rpc(supabase, 'collect_food', { target: id, code: input.pickup_code }) }));
});
export const myReservationsGet = handler(async () => {
  const { supabase, user } = await requireUser();
  return NextResponse.json(c.reservationsResponseSchema.parse({ reservations: (await reservations(supabase)).filter(row => row.student_id === user.id) }));
});
export const myListingsGet = handler(async () => {
  const { supabase, user } = await requireUser(); return NextResponse.json(c.listingsResponseSchema.parse({ listings: await listings(supabase, {}, user.id) }));
});
export const impactGet = handler(async () => {
  const { supabase } = await requireUser(); return NextResponse.json(c.impactSchema.parse(await rpc(supabase, 'food_impact')));
});
export const photoPost = handler(async request => {
  const { supabase, user } = await requireUser();
  const length = Number(request.headers.get('content-length'));
  if (!length || length > c.MEDIA_LIMITS.photoBytes + 65536) throw new ApiError(422, 'INVALID_INPUT', 'Photo request exceeds upload limit or lacks content length.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(422, 'INVALID_INPUT', 'Missing upload body.');
  const chunks: Uint8Array[] = []; let total = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    total += value.byteLength;
    if (total > c.MEDIA_LIMITS.photoBytes + 65536) { await reader.cancel(); throw new ApiError(422, 'INVALID_INPUT', 'Upload too large.'); }
    chunks.push(value);
  }
  let form: FormData;
  try { form = await new Request(request.url, { method: 'POST', headers: { 'content-type': request.headers.get('content-type') ?? '' }, body: Buffer.concat(chunks) }).formData(); } catch { throw new ApiError(422, 'INVALID_INPUT', 'Invalid multipart upload.'); }
  if (form.getAll('photo').length !== 1) throw new ApiError(422, 'INVALID_INPUT', 'Provide one photo.');
  const input = c.photoUploadRequestSchema.parse(Object.fromEntries(form));
  const { validatePhoto, PhotoValidationError } = await import('./photo');
  let bytes: Buffer;
  try { bytes = await validatePhoto(input.photo); } catch (error) {
    if (error instanceof PhotoValidationError) throw new ApiError(422, 'INVALID_INPUT', error.message);
    throw error;
  }
  const path = `${user.id}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from('food-photos').upload(path, bytes, { contentType: 'image/webp', upsert: false }); databaseError(error);
  return NextResponse.json(c.photoResponseSchema.parse({ photo_path: path }), { status: 201 });
});
