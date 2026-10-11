import { z } from 'zod';

export const recoveryEmailSchema = z.object({
  email: z.string().trim().max(254).pipe(z.email('Enter a valid email address.')),
}).strict();

export const newPasswordSchema = z.object({
  password: z.string().min(8, 'Use at least 8 characters for your password.').max(256, 'Use at most 256 characters.'),
  confirm_password: z.string(),
}).strict().refine(value => value.password === value.confirm_password, {
  message: 'Your passwords do not match.', path: ['confirm_password'],
});

// Recovery has a fixed destination, independent of untrusted return URLs.
export function recoveryCallback(origin: string) {
  const url = new URL('/auth/callback', origin);
  url.searchParams.set('type', 'recovery');
  return url.toString();
}

export function isRecoveryCallback(type: string | null, redirectType?: string | null) {
  return type === 'recovery' || redirectType === 'recovery';
}
