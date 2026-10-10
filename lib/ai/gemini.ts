import 'server-only';
import { z } from 'zod';
import { ApiError } from '@/lib/server/api';
export async function generate<T>(instructions: string, prompt: string, schema: z.ZodType<T>, photo?: Buffer): Promise<T> {
  const key = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL;
  if (!key || !model) throw new ApiError(503, 'CONFIGURATION_MISSING', 'Photo assistance and natural-language search require GEMINI_API_KEY and GEMINI_MODEL. Manual posting and standard filters remain available.');
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new ApiError(503, 'CONFIGURATION_MISSING', 'GEMINI_MODEL must contain a configured model identifier.');
  const parts: object[] = [{ text: prompt }];
  if (photo) parts.push({ inlineData: { mimeType: 'image/webp', data: photo.toString('base64') } });
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, signal: AbortSignal.timeout(45000),
      body: JSON.stringify({ systemInstruction: { parts: [{ text: instructions }] }, contents: [{ role: 'user', parts }], generationConfig: { temperature: 0, maxOutputTokens: 8192, responseMimeType: 'application/json', responseJsonSchema: z.toJSONSchema(schema, { io: 'output' }) } }),
    });
    if (response.status === 429) throw new ApiError(429, 'RATE_LIMITED', 'Gemini is busy. Try again later or use manual posting and standard filters.');
    if (!response.ok) throw new Error('Provider failed');
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
