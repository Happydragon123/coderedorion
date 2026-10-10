import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ErrorCode } from '@/lib/contracts';
export class ApiError extends Error {
  constructor(public status: number, public code: ErrorCode, message: string, public options?: { retryAfterSeconds?: number; rateLimitSource?: 'app' | 'provider' }) { super(message); }
}
export function apiError(error: unknown) {
  if (error instanceof ApiError) {
    const headers = new Headers();
    const retryAfter = error.options?.retryAfterSeconds;
    if (retryAfter !== undefined && Number.isSafeInteger(retryAfter) && retryAfter >= 0) headers.set('Retry-After', String(retryAfter));
    if (error.options?.rateLimitSource === 'app' || error.options?.rateLimitSource === 'provider') headers.set('X-AI-Rate-Limit-Source', error.options.rateLimitSource);
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers });
  }
  if (error instanceof z.ZodError) return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Request does not match the API contract.' } }, { status: 422 });
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Request failed.' } }, { status: 500 });
}
export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try { body = await request.json(); } catch { throw new ApiError(422, 'INVALID_INPUT', 'Expected a JSON body.'); }
  return schema.parse(body);
}
