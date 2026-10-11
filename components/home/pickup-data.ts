import verifiedSpots from '@/docs/verified-pickup-spots.json';
import type { Listing, Location } from '@/lib/contracts';

export type CampusLandmark = Pick<Location, 'name' | 'latitude' | 'longitude' | 'google_maps_url'>;
export type PickupSpot = { location: Location; listings: Listing[]; portions: number };
export type PickupMarker = { landmark: CampusLandmark; pickup?: PickupSpot };
// Administrator-verified landmarks, not food inventory or fixture coordinates.
export const campusLandmarks: CampusLandmark[] = verifiedSpots;

export function groupAvailablePickups(listings: Listing[], now: number): PickupSpot[] {
  const groups = new Map<string, PickupSpot>();
  for (const listing of listings) {
    if (listing.status !== 'open' || listing.available_portions <= 0 || Date.parse(listing.pickup_deadline) <= now) continue;
    const spot = groups.get(listing.location_id) ?? { location: listing.location, listings: [], portions: 0 };
    spot.listings.push(listing);
    spot.portions += listing.available_portions;
    groups.set(listing.location_id, spot);
  }
  return [...groups.values()].sort((a, b) => a.location.name.localeCompare(b.location.name));
}

export function mapLandmarks(locations: CampusLandmark[], spots: PickupSpot[]): CampusLandmark[] {
  const landmarks = [...campusLandmarks];
  for (const location of [...locations, ...spots.map(spot => spot.location)]) {
    const index = landmarks.findIndex(landmark => landmark.name === location.name);
    if (index >= 0) landmarks[index] = location;
    else landmarks.push(location);
  }
  return landmarks;
}

export function pickupMarkers(landmarks: CampusLandmark[], spots: PickupSpot[]): PickupMarker[] {
  return landmarks.map(landmark => ({ landmark, pickup: spots.find(spot => spot.location.name === landmark.name) }));
}
