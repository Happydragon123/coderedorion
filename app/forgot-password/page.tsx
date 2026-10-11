import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/shared/forgot-password-form';
import { missingSupabaseMessage, supabaseConfig } from '@/lib/supabase/config';

export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <section className="panel auth-panel">
    <p className="eyebrow">Back to your campus connection</p><h1>Forgot your password?</h1>
    {error === 'recovery' && <p className="notice" role="alert">This reset link is invalid or has expired. Request a new link below. For a link opened on another device, try the browser where you requested it.</p>}
    <p>Enter your account email and we’ll send you a link to choose a new password.</p>
    {supabaseConfig() ? <ForgotPasswordForm/> : <p className="notice">{missingSupabaseMessage}</p>}
    <p><Link href="/sign-in">Back to sign in</Link></p>
  </section>;
}
