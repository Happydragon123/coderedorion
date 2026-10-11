import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfig } from '@/lib/supabase/config';
import { authDestination } from '@/lib/auth-input';
import { isRecoveryCallback } from '@/lib/password-recovery';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const next = authDestination(url.searchParams.get('next'));
  let recovery = isRecoveryCallback(type);
  if (supabaseConfig() && (code || (tokenHash && (type === 'email' || type === 'signup' || type === 'recovery')))) {
    const client = await createClient();
    const result = code ? await client.auth.exchangeCodeForSession(code) : await client.auth.verifyOtp({ token_hash: tokenHash!, type: type as 'email' | 'signup' | 'recovery' });
    if ('redirectType' in result.data && typeof result.data.redirectType === 'string') recovery = isRecoveryCallback(type, result.data.redirectType);
    if (!result.error) {
      const response = NextResponse.redirect(new URL(recovery ? '/reset-password' : next, url.origin));
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
  }
  const target = new URL(recovery ? '/forgot-password' : '/sign-in', url.origin);
  target.searchParams.set('error', recovery ? 'recovery' : 'callback');
  if (!recovery) target.searchParams.set('next', next);
  const response = NextResponse.redirect(target);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
