'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
export function AuthForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage('');
    const fields = new FormData(event.currentTarget);
    try {
      const { error } = await createClient().auth.signInWithPassword({ email: String(fields.get('email')), password: String(fields.get('password')) });
      if (error) { setMessage(error.message); return; }
      // Fetch the protected page with the newly written session cookies.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- A full reload avoids the observed replace/refresh race after sign-in.
      window.location.assign('/account');
    } catch { setMessage('Unable to reach authentication. Check configuration and try again.'); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit}><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254}/><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required/><button disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button><p role="status" aria-live="polite">{message}</p></form>;
}
