import 'server-only';
import { ApiError } from '@/lib/server/api';
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
