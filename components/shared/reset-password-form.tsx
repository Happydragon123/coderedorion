'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { newPasswordSchema } from '@/lib/password-recovery';
import { resetPassword } from '@/app/reset-password/actions';

export function ResetPasswordForm() {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const status = useRef<HTMLDivElement>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    setError('');
    const input = newPasswordSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!input.success) {
      setError(input.error.issues[0].message);
      (form.elements.namedItem(String(input.error.issues[0].path[0])) as HTMLInputElement | null)?.focus();
      return;
    }
    inFlight.current = true; setPending(true);
    try {
      const result = await resetPassword(input.data);
      if (!result.success) { setError(result.error || 'Unable to update your password. Please try again.'); return; }
      form.reset(); setSuccess(true);
      requestAnimationFrame(() => status.current?.focus());
    } catch { setError('Unable to reach the service. Please try again.'); }
    finally { inFlight.current = false; setPending(false); }
  }

  if (success) return <div ref={status} tabIndex={-1} role="status">
    <h2>Password updated</h2><p>Your new password is ready to use. You’re signed in and can return to your account.</p>
    <Link className="button" href="/account">Go to your account</Link>
  </div>;

  return <form onSubmit={submit} aria-busy={pending}>
    <label htmlFor="reset-password">New password</label>
    <input id="reset-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={256} aria-describedby="reset-password-help" disabled={pending}/>
    <small id="reset-password-help" className="muted">Use at least 8 characters. Your account may require a stronger password.</small>
    <label htmlFor="reset-confirm">Confirm new password</label>
    <input id="reset-confirm" name="confirm_password" type="password" autoComplete="new-password" required minLength={8} maxLength={256} disabled={pending}/>
    <button disabled={pending}>{pending ? 'Updating password…' : 'Save new password'}</button>
    {error && <p className="notice" role="alert">{error}</p>}
    <p><Link href="/forgot-password">Request a new reset link</Link></p>
  </form>;
}
