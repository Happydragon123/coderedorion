import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { SignupForm } from '@/components/shared/signup-form';
import { authDestination } from '@/lib/auth-input';
import { createClient } from '@/lib/supabase/server';
import { missingSupabaseMessage, supabaseConfig } from '@/lib/supabase/config';

export default async function SignUp({ searchParams }: { searchParams: Promise<{ next?: string; confirm?: string; email?: string }> }) {
  const params = await searchParams;
  const next = authDestination(params.next);
  const configured = !!supabaseConfig();
  if (configured) {
    const client = await createClient();
    const { data } = await client.auth.getUser();
    if (data.user) redirect(next);
  }
  const email = z.email().max(254).safeParse(params.email);
  return <section className="panel auth-panel"><p className="eyebrow">Join your campus community</p><h1>Good food starts with sharing.</h1><p>One account to share surplus food and pick up a portion nearby.</p>
    {configured ? <SignupForm next={next} initialConfirmation={params.confirm === '1'} initialEmail={params.confirm === '1' && email.success ? email.data : ''}/> : <p className="notice">{missingSupabaseMessage}</p>}
    <p>Already have an account? <Link href={`/sign-in?next=${encodeURIComponent(next)}`}>Sign in</Link>.</p>
  </section>;
}
