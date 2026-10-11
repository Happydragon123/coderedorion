'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { api } from '@/lib/api-client';
import { signupCallback, signupSchema } from '@/lib/auth-input';

export function SignupForm({ next = '/account', initialEmail = '', initialConfirmation = false }: { next?: string; initialEmail?: string; initialConfirmation?: boolean }) {
  const [pending, setPending] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState(initialEmail);
  const [confirmation, setConfirmation] = useState(initialConfirmation);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!confirmation) return;
    const timer = window.setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [confirmation]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setError(''); setMessage('');
    const input = signupSchema.safeParse(Object.fromEntries(fields));
    if (!input.success) {
      setError(input.error.issues[0].message);
      (form.elements.namedItem(String(input.error.issues[0].path[0])) as HTMLInputElement | null)?.focus();
      return;
    }
    setPending(true);
    try {
      const { email, password, display_name, organization_name } = input.data;
      const { data, error: authError } = await createClient().auth.signUp({
        email, password,
        options: { data: { display_name, organization_name }, emailRedirectTo: signupCallback(window.location.origin, next) },
      });
      if (authError) { setError(authError.message); return; }
      form.reset();
      if (data.session) {
        // Save the chosen identity even when testing against the original trigger.
        try { await api.updateProfile({ display_name, organization_name }); }
        catch {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Reload with newly issued session cookies.
          window.location.assign('/account?profile=setup'); return;
        }
        window.location.assign(next);
        return;
      }
      setConfirmationEmail(email); setConfirmation(true); setCooldown(60);
      setMessage('If this address can register, a confirmation link will arrive shortly. Check your spam folder too. Already have an account? Sign in.');
    } catch { setError('Unable to reach account creation. Please try again.'); }
    finally { setPending(false); }
  }

  async function resend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || cooldown) return;
    const email = String(new FormData(event.currentTarget).get('email')).trim();
    setPending(true); setError(''); setMessage('');
    try {
      const { error: authError } = await createClient().auth.resend({ type: 'signup', email, options: { emailRedirectTo: signupCallback(window.location.origin, next) } });
      setCooldown(60);
      if (authError) { setError(authError.message); return; }
      setConfirmationEmail(email);
      setMessage('If this account needs confirmation, a new link has been sent. Use the newest email to continue.');
    } catch { setError('Unable to resend confirmation. Please try again.'); }
    finally { setPending(false); }
  }

  if (confirmation) return <div>
    <h2>Check your email</h2>
    <p>Open the confirmation link, then sign in to start sharing and finding food.</p>
    <form onSubmit={resend} aria-busy={pending}>
      <label htmlFor="confirmation-email">Account email</label>
      <input id="confirmation-email" name="email" type="email" autoComplete="email" defaultValue={confirmationEmail} maxLength={254} required disabled={pending}/>
      <button className="button-secondary" disabled={pending || cooldown > 0}>{pending ? 'Sending confirmation…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend confirmation email'}</button>
    </form>
    {error && <p className="notice" role="alert">{error}</p>}
    <p role="status" aria-live="polite">{message}</p>
    <p><Link href={`/sign-in?next=${encodeURIComponent(next)}`}>Go to sign in</Link></p>
    <button className="button-secondary" onClick={() => { setConfirmation(false); setConfirmationEmail(''); setError(''); setMessage(''); }}>Use a different account</button>
  </div>;

  return <form onSubmit={submit} aria-busy={pending}>
    <p className="muted" id="signup-identity-help">Your display name and optional organization will appear on food you share. Your email stays private.</p>
    <label htmlFor="signup-name">Display name</label><input id="signup-name" name="display_name" autoComplete="nickname" aria-describedby="signup-identity-help" required maxLength={120} disabled={pending}/>
    <label htmlFor="signup-organization">Organization <span className="muted">(optional)</span></label><input id="signup-organization" name="organization_name" autoComplete="organization" maxLength={120} disabled={pending}/>
    <label htmlFor="signup-email">Email</label><input id="signup-email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={pending}/>
    <label htmlFor="signup-password">Password</label><input id="signup-password" name="password" type="password" autoComplete="new-password" aria-describedby="password-help" required minLength={8} maxLength={256} disabled={pending}/>
    <small className="muted" id="password-help">Use at least 8 characters. Supabase may require a stronger password.</small>
    <label htmlFor="signup-confirm">Confirm password</label><input id="signup-confirm" name="confirm_password" type="password" autoComplete="new-password" required minLength={8} maxLength={256} disabled={pending}/>
    <button disabled={pending}>{pending ? 'Creating your account…' : 'Create account'}</button>
    {error && <p className="notice" role="alert">{error}</p>}
  </form>;
}
