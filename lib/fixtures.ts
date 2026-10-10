// Explicit, synthetic test fixtures. Never imported by production routes.
// Coordinates are test values, not verified campus landmarks.
import { locationSchema, listingSchema, reservationSchema, impactSchema } from './contracts';
export const demoLocation = locationSchema.parse({ id: '00000000-0000-4000-8000-000000000001', name: 'DEMO — synthetic test location', latitude: 0, longitude: 0 });
export const demoListing = listingSchema.parse({ id: '00000000-0000-4000-8000-000000000002', organizer_id: '00000000-0000-4000-8000-000000000003', location_id: demoLocation.id, title: 'DEMO — boxed meals', description: 'Synthetic inventory for interface development only.', photo_path: null, portions_total: 3, pickup_instructions: 'Demo only; no real pickup.', pickup_deadline: '2030-01-01T20:00:00Z', dietary_tags: [], ingredients_notes: null, allergen_notes: null, status: 'open', created_at: '2030-01-01T18:00:00Z', location: demoLocation, available_portions: 2 });
export const demoReservation = reservationSchema.parse({ id: '00000000-0000-4000-8000-000000000004', listing_id: demoListing.id, student_id: '00000000-0000-4000-8000-000000000005', pickup_code: 'DEMO01', status: 'reserved', created_at: '2030-01-01T18:01:00Z', collected_at: null });
export const demoImpact = impactSchema.parse({ posted_portions: 3, collected_portions: 0, active_reserved_portions: 1 });
