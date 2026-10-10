import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseConfig } from '@/lib/supabase/config';
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = supabaseConfig();
  const protectedPage = ['/account','/my-pickups','/share','/manage'].some(path => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/'));
  if (!config) return protectedPage ? NextResponse.redirect(new URL('/sign-in', request.url)) : response;
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
    const target = new URL('/sign-in', request.url);
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] };
