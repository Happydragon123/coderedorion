import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfig, missingSupabaseMessage } from '@/lib/supabase/config';
import { ApiError } from './api';
export async function requireUser() {
  if (!supabaseConfig()) throw new ApiError(503, 'CONFIGURATION_MISSING', missingSupabaseMessage);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  return { user: data.user, supabase };
}
export async function requirePageUser() {
  try { return await requireUser(); } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.code === 'CONFIGURATION_MISSING')) redirect('/sign-in');
    throw error;
  }
}
