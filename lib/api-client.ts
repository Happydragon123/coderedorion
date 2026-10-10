import { z } from 'zod';
import * as c from './contracts';
export class ApiClientError extends Error {
  constructor(public status: number, public code: c.ErrorCode, message: string, public options?: { retryAfterSeconds?: number; rateLimitSource?: 'app' | 'provider' }) { super(message); }
}
async function checkedResponse(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = c.errorEnvelopeSchema.safeParse(body);
    const retryAfter = response.headers.get('Retry-After');
    const retryAfterSeconds = retryAfter !== null && /^\d+$/.test(retryAfter) && Number.isSafeInteger(Number(retryAfter)) ? Number(retryAfter) : undefined;
    throw new ApiClientError(response.status, error.success ? error.data.error.code : 'INTERNAL_ERROR', error.success ? error.data.error.message : 'The service returned an unexpected response.', { retryAfterSeconds, rateLimitSource: response.headers.get('X-AI-Rate-Limit-Source') === 'app' ? 'app' : response.headers.get('X-AI-Rate-Limit-Source') === 'provider' ? 'provider' : undefined });
  }
  return response;
}
async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await checkedResponse(path, init);
  const data = schema.safeParse(await response.json());
  if (!data.success) throw new ApiClientError(502, 'UPSTREAM_UNAVAILABLE', 'The response does not match the shared contract.');
  return data.data;
}
const json = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const id = (value: string) => c.idSchema.parse(value);
export const api = {
  locations: () => request('/api/locations', c.locationsResponseSchema),
  listings: (filters: c.ListingFilters = {}) => {
    const parsed = c.listingFiltersSchema.parse(filters);
    const query = new URLSearchParams(Object.entries(parsed).map(([k,v]) => [k, String(v)]));
    return request(`/api/listings?${query}`, c.listingsResponseSchema);
  },
  listing: (listingId: string) => request(`/api/listings/${id(listingId)}`, c.listingResponseSchema),
  createListing: (body: c.CreateListing) => request('/api/listings', c.listingResponseSchema, json('POST', c.createListingSchema.parse(body))),
  patchListing: (listingId: string, body: c.PatchListing) => request(`/api/listings/${id(listingId)}`, c.listingResponseSchema, json('PATCH', c.patchListingSchema.parse(body))),
  reserve: (listingId: string) => request(`/api/listings/${id(listingId)}/reservations`, c.reservationResponseSchema, { method: 'POST' }),
  cancel: (reservationId: string) => request(`/api/reservations/${id(reservationId)}/cancel`, c.reservationResponseSchema, { method: 'POST' }),
  collect: (listingId: string, pickupCode: string) => request(`/api/listings/${id(listingId)}/collect`, c.reservationResponseSchema, json('POST', c.collectSchema.parse({ pickup_code: pickupCode }))),
  myReservations: () => request('/api/me/reservations', c.reservationsResponseSchema),
  myListings: () => request('/api/me/listings', c.listingsResponseSchema),
  impact: () => request('/api/impact', c.impactSchema),
  uploadPhoto: (body: FormData) => request('/api/uploads/photo', c.photoResponseSchema, { method: 'POST', body }),
  listingDraft: (body: FormData) => request('/api/ai/listing-draft', c.draftResponseSchema, { method: 'POST', body }),
  search: (body: c.SearchRequest) => request('/api/ai/search', c.searchResponseSchema, json('POST', c.searchRequestSchema.parse(body))),
};
