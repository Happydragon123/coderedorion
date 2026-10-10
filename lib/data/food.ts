import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listingFiltersSchema, listingSchema, reservationSchema, type ListingFilters } from '@/lib/contracts';
import { ApiError } from '@/lib/server/api';
export function databaseError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  const codes = { '42501': [403, 'FORBIDDEN', 'This action is not permitted.'], P0002: [404, 'NOT_FOUND', 'Record not found.'], P0001: [409, 'CONFLICT', 'Inventory or lifecycle conflict.'], '23505': [409, 'CONFLICT', 'Duplicate reservation.'], '23514': [422, 'INVALID_INPUT', 'Invalid listing values.'], '23503': [422, 'INVALID_INPUT', 'Invalid reference.'], '22P02': [422, 'INVALID_INPUT', 'Invalid values.'] } as const;
  const match = codes[error.code as keyof typeof codes];
  if (match) throw new ApiError(match[0], match[1], match[2]);
  throw new ApiError(503, 'UPSTREAM_UNAVAILABLE', 'Database request failed.');
}
export async function rpc(db: SupabaseClient, name: string, args: Record<string, unknown> = {}) {
  const { data, error } = await db.rpc(name, args); databaseError(error); return data;
}
export async function listings(db: SupabaseClient, filters: ListingFilters = {}, owner?: string, id?: string) {
  const f = listingFiltersSchema.parse(filters);
  let query = db.from('listing_availability').select('*');
  if (owner) query = query.eq('organizer_id', owner);
  else if (!id) query = query.eq('status', 'open').gt('pickup_deadline', new Date().toISOString()).gt('available_portions', 0);
  if (id) query = query.eq('id', id);
  if (f.location_id) query = query.eq('location_id', f.location_id);
  if (f.dietary_tag) query = query.contains('dietary_tags', [f.dietary_tag]);
  if (f.pickup_before) query = query.lte('pickup_deadline', f.pickup_before);
  const { data, error } = await query.order('created_at', { ascending: false }); databaseError(error);
  return (data ?? []).map(row => {
    if (f.origin_lat !== undefined && f.origin_lng !== undefined) {
      const rad = Math.PI / 180, loc = row.location;
      const a = Math.sin((loc.latitude - f.origin_lat) * rad / 2) ** 2 + Math.cos(f.origin_lat * rad) * Math.cos(loc.latitude * rad) * Math.sin((loc.longitude - f.origin_lng) * rad / 2) ** 2;
      row.distance_m = 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
    }
    return listingSchema.parse(row);
  }).filter(row => f.max_distance_m === undefined || row.distance_m! <= f.max_distance_m);
}
export async function listing(db: SupabaseClient, id: string) {
  const rows = await listings(db, {}, undefined, id);
  if (!rows[0]) throw new ApiError(404, 'NOT_FOUND', 'Listing not found.');
  return rows[0];
}
export async function reservations(db: SupabaseClient) {
  const { data, error } = await db.from('private_reservations').select('*').order('created_at', { ascending: false }); databaseError(error);
  return (data ?? []).map(row => reservationSchema.parse(row));
}
