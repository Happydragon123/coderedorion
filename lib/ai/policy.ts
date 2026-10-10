import { draftResponseSchema, listingFiltersSchema, type Listing, type ListingDraft, type Location, type SearchRequest } from '../contracts';
const required = ['location_id','title','description','portions_total','pickup_instructions','pickup_deadline'] as const;
export function reviewedDraft(draft: ListingDraft, locations: Location[]) {
  const result = { ...draft, photo_path: null, dietary_tags: null, allergen_notes: null };
  if (!locations.some(location => location.id === result.location_id)) result.location_id = null;
  if (result.pickup_deadline && Date.parse(result.pickup_deadline) <= Date.now()) result.pickup_deadline = null;
  return draftResponseSchema.parse({ draft: result, missing_fields: required.filter(key => result[key] === null) });
}
export function groundedFilters(raw: unknown, request: SearchRequest, locations: Location[]) {
  const filters = listingFiltersSchema.parse(raw);
  // A model may select a supplied landmark, but cannot invent an origin or UUID.
  if (filters.location_id && !locations.some(location => location.id === filters.location_id)) throw new Error('Unknown location');
  if (request.location_id) filters.location_id = request.location_id;
  if (request.origin) { filters.origin_lat = request.origin.latitude; filters.origin_lng = request.origin.longitude; }
  else { delete filters.origin_lat; delete filters.origin_lng; delete filters.max_distance_m; }
  return listingFiltersSchema.parse(filters);
}
export function groundedSummary(rows: Listing[]) {
  if (!rows.length) return 'No available listings match the interpreted filters. Try standard filters or a broader query.';
  // Deterministic prose prevents the model from inventing inventory or dietary claims.
  const entries: string[] = [];
  for (const row of rows) {
    const line = `${row.title} at ${row.location.name}: ${row.available_portions} available portions (listing ${row.id}).`;
    if (entries.join(' ').length + line.length > 1650) break;
    entries.push(line);
  }
  return `${rows.length} available listing${rows.length === 1 ? '' : 's'} match the interpreted filters. ${entries.join(' ')} Review the returned cards for deadlines and organizer-confirmed dietary details. Search supports location, one dietary tag, straight-line distance and pickup deadline; other preferences are not applied.`;
}
