import { ApiClientError } from '@/lib/api-client';
export function message(error: unknown) {
  return error instanceof ApiClientError ? error.message : 'Request failed. Please try again.';
}
export function deadline(value: string) { return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
