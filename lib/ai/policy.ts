import { draftResponseSchema, listingFiltersSchema, type Listing, type ListingDraft, type Location, type SearchRequest } from '../contracts';
const required = ['location_id','title','description','portions_total','pickup_instructions','pickup_deadline'] as const;
export function reviewedDraft(draft: ListingDraft) {
  // Operational pickup details require organizer entry, regardless of model claims.
  const result = { ...draft, location_id: null, portions_total: null, pickup_instructions: null, pickup_deadline: null, photo_path: null, dietary_tags: null, ingredients_notes: null, allergen_notes: null };
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
  // The model selects existing IDs only; summary facts come from retrieved rows.
  const status = rows.length
    ? `${rows.length} possible food match${rows.length === 1 ? '' : 'es'} based on listing titles and descriptions, within the applied filters.`
    : 'No matching food found in the available listing titles and descriptions within the applied filters. Try another food request or browse with standard filters.';
  const review = 'Review listing details and organizer-confirmed dietary information before reserving.';
  const entries: string[] = [];
  for (const row of rows) {
    const line = `${row.title} at ${row.location.name}: ${row.available_portions} available portions (listing ${row.id}).`;
    if ([status, ...entries, line, review].join(' ').length > 2000) break;
    entries.push(line);
  }
  return [status, ...entries, review].join(' ');
}
