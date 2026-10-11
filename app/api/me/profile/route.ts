import { NextResponse } from 'next/server';
import { profileResponseSchema, updateProfileSchema } from '@/lib/contracts';
import { profile, updateProfile } from '@/lib/data/profile';
import { requireUser } from '@/lib/server/auth';
import { readJson } from '@/lib/server/api';
import { handler } from '@/lib/server/food/handlers';

function privateHandler(action: Parameters<typeof handler>[0]) {
  const route = handler(action);
  return async (...args: Parameters<typeof route>) => {
    const response = await route(...args);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  };
}

export const GET = privateHandler(async () => {
  const { supabase, user } = await requireUser();
  return NextResponse.json(profileResponseSchema.parse({ profile: await profile(supabase, user.id) }));
});

export const PATCH = privateHandler(async request => {
  const { supabase, user } = await requireUser();
  const changes = await readJson(request, updateProfileSchema);
  return NextResponse.json(profileResponseSchema.parse({ profile: await updateProfile(supabase, user.id, changes) }));
});
