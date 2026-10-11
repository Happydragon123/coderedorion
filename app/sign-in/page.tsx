import { AuthForm } from '@/components/shared/auth-form';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { authDestination } from '@/lib/auth-input';
import { createClient } from '@/lib/supabase/server';
import { missingSupabaseMessage, supabaseConfig } from '@/lib/supabase/config';
export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next: requested } = await searchParams;
  const next = authDestination(requested);
  if (supabaseConfig()) {
    const client = await createClient();
    const { data } = await client.auth.getUser();
    if (data.user) redirect(next);
  }
  return <section className="panel auth-panel"><p className="eyebrow">Welcome back</p><h1>A little food. A lot of good.</h1>{error === 'callback' && <p role="alert" className="notice">This confirmation link failed or expired. Sign in if your email is already confirmed, or <Link href={`/sign-up?confirm=1&next=${encodeURIComponent(next)}`}>request a new confirmation email</Link>.</p>}{supabaseConfig() ? <><p>Sign in to find a pickup or share food with your campus.</p><AuthForm next={next}/></> : <p className="notice">{missingSupabaseMessage}</p>}<p>New here? <Link href={`/sign-up?next=${encodeURIComponent(next)}`}>Create an account</Link>.</p></section>;
}
