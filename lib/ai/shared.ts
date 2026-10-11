import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from '@/lib/server/api';
import { withLease, type CacheClaim, type InterpretationStore } from './reliability';

async function rpc(client: SupabaseClient, name: string, args?: Record<string, unknown>) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new ApiError(503, 'UPSTREAM_UNAVAILABLE', 'Shared AI controls are unavailable. Use manual posting or standard filters.');
  return data;
}
export function admissionError(seconds: number, message = 'AI request limit reached. Wait before trying again; manual posting and standard filters remain available.') {
  return new ApiError(429, 'RATE_LIMITED', message, { retryAfterSeconds: Math.max(1, Math.ceil(seconds)), rateLimitSource: 'app' });
}
export async function admitted<T>(client: SupabaseClient, work: () => Promise<T>): Promise<T> {
  const result = await rpc(client, 'ai_admit');
  if (!result?.allowed) {
    const error = admissionError(result?.retry_after_seconds ?? 60);
    if (result?.reason === 'provider_cooldown') error.options = { ...error.options, rateLimitSource: 'provider' };
    throw error;
  }
  if (typeof result.lease_id !== 'string') throw new ApiError(503, 'UPSTREAM_UNAVAILABLE', 'Shared AI admission failed. Use manual posting or standard filters.');
  return withLease(work,
    async () => { await rpc(client, 'ai_release', { p_lease_id: result.lease_id }); },
    async error => {
      if (error instanceof ApiError && error.status === 429) {
        const seconds = await rpc(client, 'ai_provider_cooldown', { p_lease_id: result.lease_id });
        if (Number.isInteger(seconds) && seconds > 0) error.options = { retryAfterSeconds: seconds, rateLimitSource: 'provider' };
      }
    });
}
export function interpretationStore(client: SupabaseClient): InterpretationStore {
  return {
    async claim(key) {
      const result = await rpc(client, 'ai_cache_claim', { p_cache_key: key });
      if (!result || !['hit', 'claimed', 'pending'].includes(result.status)) throw new ApiError(503, 'UPSTREAM_UNAVAILABLE', 'Search cache is unavailable. Use standard filters.');
      return result as CacheClaim;
    },
    async complete(key, token, filters) { await rpc(client, 'ai_cache_complete', { p_cache_key: key, p_claim_id: token, p_filters: filters }); },
    async abandon(key, token) { await rpc(client, 'ai_cache_abandon', { p_cache_key: key, p_claim_id: token }); },
  };
}
