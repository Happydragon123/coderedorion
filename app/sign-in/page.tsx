import { AuthForm } from '@/components/shared/auth-form';
import { missingSupabaseMessage, supabaseConfig } from '@/lib/supabase/config';
export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <section className="panel"><h1>Sign in</h1>{error === 'callback' && <p role="alert" className="notice">The authentication callback failed or expired. Sign in again.</p>}{supabaseConfig() ? <><p>Use a confirmed account from your shared Supabase project.</p><AuthForm/></> : <p className="notice">{missingSupabaseMessage}</p>}</section>;
}
