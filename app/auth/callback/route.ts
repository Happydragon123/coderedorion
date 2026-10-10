import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfig } from '@/lib/supabase/config';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (code && supabaseConfig()) {
    const client = await createClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL('/account', url.origin));
  }
  return NextResponse.redirect(new URL('/sign-in?error=callback', url.origin));
}
