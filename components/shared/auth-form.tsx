'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
export function AuthForm({ next = '/account' }: { next?: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return; setPending(true); setMessage(''); setUnconfirmedEmail('');
    const fields = new FormData(event.currentTarget);
    try {
      const { error } = await createClient().auth.signInWithPassword({ email: String(fields.get('email')), password: String(fields.get('password')) });
      if (error) { setMessage(error.message); if (error.code === 'email_not_confirmed') setUnconfirmedEmail(String(fields.get('email')).trim()); return; }
      // Fetch the protected page with the newly written session cookies.
      window.location.assign(next);
    } catch { setMessage('Unable to reach authentication. Check configuration and try again.'); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit}><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254}/><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required/><p><Link href="/forgot-password">Forgot your password?</Link></p><button disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button><p role="status" aria-live="polite">{message}</p>{unconfirmedEmail && <Link href={`/sign-up?confirm=1&email=${encodeURIComponent(unconfirmedEmail)}&next=${encodeURIComponent(next)}`}>Resend your confirmation email</Link>}</form>;
}
