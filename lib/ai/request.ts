import 'server-only';
import { ApiError } from '@/lib/server/api';
const usage = new Map<string, { start: number; count: number; active: boolean }>();
// Best-effort per-process limiter. Replace with a shared limiter for multi-instance hosting.
export function acquire(userId: string) {
  const now = Date.now();
  for (const [key, value] of usage) if (now - value.start > 60000 && !value.active) usage.delete(key);
  let value = usage.get(userId);
  if (!value || now - value.start > 60000 && !value.active) { value = { start: now, count: 0, active: false }; usage.set(userId, value); }
  if (value.active || value.count >= 6 || usage.size > 10000) throw new ApiError(429, 'RATE_LIMITED', 'Too many AI requests. Wait a minute and try again.');
  value.count++; value.active = true;
  return () => { value.active = false; };
}
export async function boundedRequest(request: Request, limit: number) {
  if (Number(request.headers.get('content-length')) > limit) throw new ApiError(422, 'INVALID_INPUT', 'Request body is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(422, 'INVALID_INPUT', 'Request body is required.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const result = await reader.read(); if (result.done) break;
      size += result.value.length;
      if (size > limit) { await reader.cancel(); throw new ApiError(422, 'INVALID_INPUT', 'Request body is too large.'); }
      chunks.push(result.value);
    }
  } finally { reader.releaseLock(); }
  return new Request(request.url, { method: 'POST', headers: request.headers, body: Buffer.concat(chunks) });
}
