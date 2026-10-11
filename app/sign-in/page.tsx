import { AuthForm } from '@/components/shared/auth-form';
import { missingSupabaseMessage, supabaseConfig } from '@/lib/supabase/config';
export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <section className="panel auth-panel"><p className="eyebrow">Welcome back</p><h1>A little food. A lot of good.</h1>{error === 'callback' && <p role="alert" className="notice">The authentication callback failed or expired. Sign in again.</p>}{supabaseConfig() ? <><p>Sign in to find a pickup or share food with your campus.</p><AuthForm/></> : <p className="notice">{missingSupabaseMessage}</p>}</section>;
}
