import Link from 'next/link';
import { ResetPasswordForm } from '@/components/shared/reset-password-form';
import { createClient } from '@/lib/supabase/server';
import { missingSupabaseMessage, supabaseConfig } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export default async function ResetPassword() {
  if (!supabaseConfig()) return <section className="panel auth-panel"><h1>Choose a new password</h1><p className="notice">{missingSupabaseMessage}</p></section>;
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  return <section className="panel auth-panel">
    <p className="eyebrow">A fresh start</p><h1>Choose a new password</h1>
    {!error && data.user ? <><p>Choose a strong password that you haven’t used elsewhere.</p><ResetPasswordForm/></> : <>
      <p className="notice" role="alert">Open the newest link from your reset email to continue. If the link has expired, request another one.</p>
      <Link className="button" href="/forgot-password">Request a reset link</Link><p><Link href="/sign-in">Back to sign in</Link></p>
    </>}
  </section>;
}
