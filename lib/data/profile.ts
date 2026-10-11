import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { idSchema, profileSchema, updateProfileSchema } from '@/lib/contracts';
import { ApiError } from '@/lib/server/api';
import { databaseError } from './food';

const profileColumns = 'id,display_name,organization_name';

export async function profile(db: SupabaseClient, userId: string) {
  const id = idSchema.parse(userId);
  const { data, error } = await db.from('profiles').select(profileColumns).eq('id', id).maybeSingle();
  databaseError(error);
  if (!data) throw new ApiError(404, 'NOT_FOUND', 'Sharing profile not found.');
  return profileSchema.parse(data);
}

export async function updateProfile(db: SupabaseClient, userId: string, input: unknown) {
  const id = idSchema.parse(userId);
  const changes = updateProfileSchema.parse(input);
  const { data, error } = await db.from('profiles').update({
    display_name: changes.display_name,
    organization_name: changes.organization_name || null,
  }).eq('id', id).select(profileColumns).maybeSingle();
  databaseError(error);
  if (!data) throw new ApiError(404, 'NOT_FOUND', 'Sharing profile not found.');
  return profileSchema.parse(data);
}
