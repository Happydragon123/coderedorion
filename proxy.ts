import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseConfig } from '@/lib/supabase/config';
import { authDestination } from '@/lib/auth-input';
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = supabaseConfig();
  const protectedPage = ['/account','/listings','/my-pickups','/impact','/share','/manage'].some(path => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/'));
  const signInTarget = new URL('/sign-in', request.url);
  signInTarget.searchParams.set('next', authDestination(request.nextUrl.pathname + request.nextUrl.search));
  if (!config) return protectedPage ? NextResponse.redirect(signInTarget) : response;
  const supabase = createServerClient(config.url, config.key, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll(values) {
      values.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    },
  } });
  const { data, error } = await supabase.auth.getUser();
  if (protectedPage && (error || !data.user)) {
    const redirect = NextResponse.redirect(signInTarget);
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    for (const name of ['cache-control','expires','pragma']) {
      const value = response.headers.get(name); if (value) redirect.headers.set(name, value);
    }
    return redirect;
  }
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] };
