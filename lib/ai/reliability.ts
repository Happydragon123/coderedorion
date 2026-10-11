import { createHash } from 'node:crypto';
import type { ListingFilters, Location, SearchRequest } from '../contracts';
import { groundedFilters } from './policy';

export const SEARCH_POLICY_VERSION = 'search-v4-title-description-relevance';
export function interpretationKey(input: SearchRequest, locations: Location[], model: string) {
  return createHash('sha256').update(JSON.stringify({
    query: input.query.normalize('NFKC').trim().replace(/\s+/g, ' '),
    origin: input.origin ?? null, location: input.location_id ?? null, model,
    policy: SEARCH_POLICY_VERSION, timezone: 'America/Chicago',
    landmarks: [...locations].sort((a, b) => a.id.localeCompare(b.id)),
  })).digest('hex');
}
export type CacheClaim = { status: 'hit' | 'claimed' | 'pending'; filters?: unknown; claim_id?: string; retry_after_seconds?: number };
export interface InterpretationStore {
  claim(key: string): Promise<CacheClaim>;
  complete(key: string, token: string, filters: ListingFilters): Promise<void>;
  abandon(key: string, token: string): Promise<void>;
}
// Cache only interpretations without deadlines. This also covers relative time expressions
// the model interprets in unexpected ways: any temporal output is never persisted.
export async function interpret(input: SearchRequest, locations: Location[], model: string, store: InterpretationStore, generate: () => Promise<unknown>, busy: (seconds: number) => Error) {
  const key = interpretationKey(input, locations, model);
  const claim = await store.claim(key);
  if (claim.status === 'hit') return groundedFilters(claim.filters, input, locations);
  if (claim.status === 'pending') throw busy(claim.retry_after_seconds ?? 2);
  if (!claim.claim_id) throw new Error('Missing cache claim');
  try {
    const filters = groundedFilters(await generate(), input, locations);
    if (!filters.pickup_before && !hasTemporalQuery(input.query)) await store.complete(key, claim.claim_id, filters);
    else await store.abandon(key, claim.claim_id);
    return filters;
  } catch (error) {
    await store.abandon(key, claim.claim_id).catch(() => undefined);
    throw error;
  }
}
export function hasTemporalQuery(query: string) {
  // Conservative: numbers/date punctuation and time language bypass persistence.
  return /\d|[:/]|\b(today|tonight|tomorrow|yesterday|now|soon|later|before|after|until|within|next|this|morning|afternoon|evening|night|noon|midnight|minute|hour|day|week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(query);
}

export async function withLease<T>(work: () => Promise<T>, release: () => Promise<void>, throttled: (error: unknown) => Promise<void>) {
  try { return await work(); }
  catch (error) { await throttled(error).catch(() => undefined); throw error; }
  finally { await release().catch(() => undefined); }
}
