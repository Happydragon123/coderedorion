import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfig } from '@/lib/supabase/config';
import { authDestination } from '@/lib/auth-input';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const next = authDestination(url.searchParams.get('next'));
  if (supabaseConfig() && (code || (tokenHash && (type === 'email' || type === 'signup')))) {
    const client = await createClient();
    const { error } = code ? await client.auth.exchangeCodeForSession(code) : await client.auth.verifyOtp({ token_hash: tokenHash!, type: type as 'email' | 'signup' });
    if (!error) {
      const response = NextResponse.redirect(new URL(next, url.origin));
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
  }
  const target = new URL('/sign-in', url.origin);
  target.searchParams.set('error', 'callback'); target.searchParams.set('next', next);
  const response = NextResponse.redirect(target);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
