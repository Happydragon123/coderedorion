import { z } from 'zod';
import { updateProfileSchema } from './contracts';

export const signupSchema = updateProfileSchema.extend({
  email: z.string().trim().max(254).pipe(z.email('Enter a valid email address.')),
  password: z.string().min(8, 'Use at least 8 characters for your password.').max(256),
  confirm_password: z.string(),
}).strict().refine(value => value.password === value.confirm_password, {
  message: 'Your passwords do not match.', path: ['confirm_password'],
});

// Restrict returns to the app's known pages; reject protocol-relative URLs,
// escapes, auth loops and control characters rather than creating an open redirect.
export function authDestination(value: unknown) {
  if (typeof value !== 'string' || /[\\\s%#]/.test(value)) return '/account';
  if (/^\/(?:account|listings|my-pickups|share|manage|impact)(?:\/[a-zA-Z0-9-]+)?(?:\?[^\\\s%#]*)?$/.test(value)) return value;
  return '/account';
}

export function signupCallback(origin: string, next: string) {
  const url = new URL('/auth/callback', origin);
  url.searchParams.set('next', authDestination(next));
  return url.toString();
}
