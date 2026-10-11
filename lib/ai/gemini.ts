import 'server-only';
import { z } from 'zod';
import { ApiError } from '@/lib/server/api';
import { providerFailureMessage } from './provider-errors';
export async function generate<T>(instructions: string, prompt: string, schema: z.ZodType<T>, photo?: Buffer, options: { timeoutMs?: number; maxOutputTokens?: number } = {}): Promise<T> {
  const key = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL;
  if (!key || !model) {
    const missing = [!key && 'GEMINI_API_KEY', !model && 'GEMINI_MODEL'].filter(Boolean);
    throw new ApiError(503, 'CONFIGURATION_MISSING', `Missing server configuration: ${missing.join(', ')}. Manual posting and standard filters remain available.`);
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new ApiError(503, 'CONFIGURATION_MISSING', 'GEMINI_MODEL must contain a configured model identifier.');
  const parts: object[] = [{ text: prompt }];
  if (photo) parts.push({ inlineData: { mimeType: 'image/webp', data: photo.toString('base64') } });
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, signal: AbortSignal.timeout(Math.max(1, Math.min(45000, options.timeoutMs ?? 45000))),
      body: JSON.stringify({ systemInstruction: { parts: [{ text: instructions }] }, contents: [{ role: 'user', parts }], generationConfig: { temperature: 0, maxOutputTokens: Math.max(1, Math.min(8192, options.maxOutputTokens ?? 8192)), responseMimeType: 'application/json', responseJsonSchema: z.toJSONSchema(schema, { io: 'output' }) } }),
    });
    if (response.status === 429) throw new ApiError(429, 'RATE_LIMITED', 'Gemini quota is unavailable. Wait before trying again or use manual posting and standard filters.', { retryAfterSeconds: 3600, rateLimitSource: 'provider' });
    if (!response.ok) throw new ApiError(503, 'UPSTREAM_UNAVAILABLE', providerFailureMessage(response.status, await response.json().catch(() => null)));
    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason !== 'STOP') throw new Error('Incomplete output');
    const text = candidate.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('');
    const parsed = schema.safeParse(JSON.parse(text));
    if (!parsed.success) throw new Error('Invalid output');
    return parsed.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) throw new ApiError(503, 'UPSTREAM_UNAVAILABLE', 'Gemini took too long. Try again or use manual posting and standard filters.');
    throw new ApiError(503, 'UPSTREAM_UNAVAILABLE', 'Gemini could not produce a valid response. Try again or use manual posting and standard filters.');
  }
}
