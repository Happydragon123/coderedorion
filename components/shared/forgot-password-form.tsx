'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { recoveryCallback, recoveryEmailSchema } from '@/lib/password-recovery';

export function ForgotPasswordForm() {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const timer = window.setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || cooldown) return;
    const form = event.currentTarget;
    setError(''); setMessage('');
    const input = recoveryEmailSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!input.success) { setError(input.error.issues[0].message); (form.elements.namedItem('email') as HTMLInputElement)?.focus(); return; }
    inFlight.current = true; setPending(true);
    try {
      const { error: authError } = await createClient().auth.resetPasswordForEmail(input.data.email, { redirectTo: recoveryCallback(window.location.origin) });
      setCooldown(60);
      if (authError) { setError(authError.message); return; }
      setMessage('If an account uses this email, a reset link will arrive shortly. Check your spam folder and use the newest link.');
    } catch { setError('Unable to send a reset link. Please try again.'); }
    finally { inFlight.current = false; setPending(false); }
  }

  return <form onSubmit={submit} aria-busy={pending}>
    <label htmlFor="recovery-email">Account email</label>
    <input id="recovery-email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={pending}/>
    <button disabled={pending || cooldown > 0}>{pending ? 'Sending reset link…' : cooldown > 0 ? `Send again in ${cooldown}s` : 'Send reset link'}</button>
    {error && <p className="notice" role="alert">{error}</p>}
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}
