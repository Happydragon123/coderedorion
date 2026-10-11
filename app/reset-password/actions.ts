'use server';

import { requireUser } from '@/lib/server/auth';
import { ApiError } from '@/lib/server/api';
import { newPasswordSchema } from '@/lib/password-recovery';

export async function resetPassword(input: unknown): Promise<{ success: boolean; error?: string }> {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
  try {
    // A recovery link creates a real Supabase session. Never trust client state.
    const { supabase } = await requireUser();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof ApiError && error.status === 401
      ? 'Your session has expired. Request a new reset link to continue.'
      : 'Unable to update your password. Please try again.' };
  }
}
