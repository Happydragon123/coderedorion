import { z } from 'zod';

export const idSchema = z.uuid();
export const timestampSchema = z.iso.datetime({ offset: true });
export const dietaryTagSchema = z.enum(['vegetarian', 'vegan', 'halal', 'gluten_free']);
export const locationSchema = z.object({ id: idSchema, name: z.string().min(1).max(120), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).strict();
export const profileSchema = z.object({ id: idSchema, display_name: z.string().min(1).max(120), organization_name: z.string().max(120).nullable() }).strict();
const listingFields = {
  location_id: idSchema, title: z.string().trim().min(1).max(160), description: z.string().trim().min(1).max(4000),
  photo_path: z.string().min(1).max(512).nullable(), portions_total: z.number().int().positive().max(10000),
  pickup_instructions: z.string().trim().min(1).max(1000), pickup_deadline: timestampSchema,
  dietary_tags: z.array(dietaryTagSchema).max(4).refine(v => new Set(v).size === v.length, 'Duplicate dietary tags'),
  ingredients_notes: z.string().max(2000).nullable(), allergen_notes: z.string().max(2000).nullable(),
};
export const createListingSchema = z.object(listingFields).strict();
export const patchListingSchema = createListingSchema.partial().extend({ status: z.enum(['open', 'closed']).optional() }).strict().refine(v => Object.keys(v).length > 0, 'Provide at least one field');
export const listingSchema = createListingSchema.extend({ id: idSchema, organizer_id: idSchema, status: z.enum(['open', 'closed']), created_at: timestampSchema, location: locationSchema, available_portions: z.number().int().nonnegative(), distance_m: z.number().nonnegative().optional() }).strict();
export const reservationSchema = z.object({ id: idSchema, listing_id: idSchema, student_id: idSchema, pickup_code: z.string().min(1).max(32), status: z.enum(['reserved', 'collected', 'cancelled', 'expired']), created_at: timestampSchema, collected_at: timestampSchema.nullable() }).strict();
export const collectSchema = z.object({ pickup_code: z.string().trim().min(1).max(32) }).strict();
const queryNumber = (min: number, max: number) => z.preprocess(v => typeof v === 'string' && v.trim() !== '' ? Number(v) : v, z.number().min(min).max(max));
export const listingFiltersSchema = z.object({ location_id: idSchema.optional(), dietary_tag: dietaryTagSchema.optional(), origin_lat: queryNumber(-90,90).optional(), origin_lng: queryNumber(-180,180).optional(), max_distance_m: queryNumber(1,100000).optional(), pickup_before: timestampSchema.optional() }).strict().superRefine((v,ctx) => {
  if ((v.origin_lat === undefined) !== (v.origin_lng === undefined)) ctx.addIssue({ code: 'custom', message: 'Both origin coordinates are required', path: ['origin_lat'] });
  if (v.max_distance_m !== undefined && (v.origin_lat === undefined || v.origin_lng === undefined)) ctx.addIssue({ code: 'custom', message: 'Distance requires origin coordinates', path: ['max_distance_m'] });
});
export const originSchema = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).strict();
export const searchRequestSchema = z.object({ query: z.string().trim().min(1).max(1000), origin: originSchema.optional(), location_id: idSchema.optional() }).strict();
export const draftSchema = z.object(Object.fromEntries(Object.entries(listingFields).map(([key, schema]) => [key, schema.nullable()])) as { [K in keyof typeof listingFields]: z.ZodNullable<(typeof listingFields)[K]> }).strict();
export const draftResponseSchema = z.object({ draft: draftSchema, missing_fields: z.array(z.enum(['location_id','title','description','portions_total','pickup_instructions','pickup_deadline'])) }).strict();
export const impactSchema = z.object({ posted_portions: z.number().int().nonnegative(), collected_portions: z.number().int().nonnegative(), active_reserved_portions: z.number().int().nonnegative() }).strict();
export const errorCodeSchema = z.enum(['UNAUTHENTICATED','FORBIDDEN','NOT_FOUND','CONFLICT','INVALID_INPUT','RATE_LIMITED','UPSTREAM_UNAVAILABLE','CONFIGURATION_MISSING','INTERNAL_ERROR']);
export const errorEnvelopeSchema = z.object({ error: z.object({ code: errorCodeSchema, message: z.string() }).strict() }).strict();
export const locationsResponseSchema = z.object({ locations: z.array(locationSchema) }).strict();
export const listingsResponseSchema = z.object({ listings: z.array(listingSchema) }).strict();
export const listingResponseSchema = z.object({ listing: listingSchema }).strict();
export const reservationResponseSchema = z.object({ reservation: reservationSchema }).strict();
export const reservationsResponseSchema = z.object({ reservations: z.array(reservationSchema) }).strict();
export const photoResponseSchema = z.object({ photo_path: z.string().min(1).max(512) }).strict();
export const searchResponseSchema = z.object({ filters: listingFiltersSchema, listings: z.array(listingSchema), summary: z.string().max(2000) }).strict();
export const MEDIA_LIMITS = { photoBytes: 5 * 1024 * 1024, photoMimeTypes: ['image/jpeg','image/png','image/webp'] } as const;
export type Location = z.infer<typeof locationSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Listing = z.infer<typeof listingSchema>;
export type Reservation = z.infer<typeof reservationSchema>;
export type CreateListing = z.infer<typeof createListingSchema>;
export type PatchListing = z.infer<typeof patchListingSchema>;
export type ListingFilters = z.infer<typeof listingFiltersSchema>;
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type ListingDraft = z.infer<typeof draftSchema>;
export type Impact = z.infer<typeof impactSchema>;
export type ErrorCode = z.infer<typeof errorCodeSchema>;

// Metadata checks are a first pass; endpoint owners must inspect/decode content too.
export const photoFileSchema = z.file().max(MEDIA_LIMITS.photoBytes).mime([...MEDIA_LIMITS.photoMimeTypes]);
export const photoUploadRequestSchema = z.object({ photo: photoFileSchema }).strict();
export const draftRequestSchema = z.object({ photo: photoFileSchema.optional(), description: z.string().trim().max(10000).optional() }).strict().refine(v => Boolean(v.photo || v.description), 'Provide a photo or description');
export const listingRowSchema = createListingSchema.extend({ id: idSchema, organizer_id: idSchema, status: z.enum(['open', 'closed']), created_at: timestampSchema }).strict();
export type ListingRow = z.infer<typeof listingRowSchema>;
