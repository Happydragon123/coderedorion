 'use client';
import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api-client';
import type { ListingFilters, Location } from '@/lib/contracts';
import { originSchema } from '@/lib/contracts';
import { Failure, FoodCard, dietaryLabels, useClock, useResource } from './common';
import styles from './student.module.css';
const FoodMap = dynamic(() => import('@/components/map/food-map'), { ssr: false, loading: () => <p role="status">Loading map…</p> });
const tiles = process.env.NEXT_PUBLIC_MAP_TILE_URL;
const attribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION;
export function FoodFeed() {
  const locations = useResource(api.locations);
  const [filters, setFilters] = useState<ListingFilters>({});
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number }>();
  const [deviceOrigin, setDeviceOrigin] = useState<{ latitude: number; longitude: number }>();
  const [geoMessage, setGeoMessage] = useState('');
  const [geoBusy, setGeoBusy] = useState(false);
  function locate() {
    if (!navigator.geolocation) { setGeoMessage('Geolocation is unavailable. Choose a landmark instead.'); return; }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(position => {
      const point = originSchema.safeParse({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      if (point.success) { setOrigin(point.data); setDeviceOrigin(point.data); setGeoMessage('Using your location. Apply filters to update distances.'); }
      else setGeoMessage('Location could not be used. Choose a landmark instead.');
      setGeoBusy(false);
    }, () => { setGeoBusy(false); setGeoMessage('Location access failed or was denied. Choose a landmark instead.'); }, { timeout: 10000, maximumAge: 60000 });
  }
  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const next: ListingFilters = {};
    if (data.get('location')) next.location_id = String(data.get('location'));
    if (data.get('diet')) next.dietary_tag = String(data.get('diet')) as ListingFilters['dietary_tag'];
    if (origin) { next.origin_lat = origin.latitude; next.origin_lng = origin.longitude; if (data.get('distance')) next.max_distance_m = Number(data.get('distance')); }
    if (data.get('before')) next.pickup_before = new Date(String(data.get('before'))).toISOString();
    setFilters(next);
  }
  return <>{locations.loading && <p role="status">Loading landmarks…</p>}{locations.error && <Failure message={locations.error} retry={locations.refresh}/>}<form onSubmit={apply} className={styles.filters}>
    <div><label htmlFor="landmark">Pickup landmark</label><select id="landmark" name="location"><option value="">All landmarks</option>{locations.data?.locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div>
    <div><label htmlFor="origin">Distance from</label><select id="origin" value={origin ? (locations.data?.locations.find(l => l.latitude === origin.latitude && l.longitude === origin.longitude)?.id ?? 'device') : ''} onChange={e => { const location = locations.data?.locations.find(l => l.id === e.target.value); setOrigin(location ? { latitude: location.latitude, longitude: location.longitude } : e.target.value === 'device' ? deviceOrigin : undefined); }}><option value="">No distance origin</option>{deviceOrigin && <option value="device">Device location</option>}{locations.data?.locations.map((location: Location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div>
    <div><label htmlFor="diet">Confirmed dietary tag</label><select id="diet" name="diet"><option value="">Any / unknown included</option>{Object.entries(dietaryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <div><label htmlFor="distance">Maximum straight-line distance</label><select id="distance" name="distance" disabled={!origin}><option value="">Any distance</option><option value="805">0.5 miles</option><option value="1609">1 mile</option><option value="4828">3 miles</option></select></div>
    <div><label htmlFor="before">Pickup deadline before (device timezone)</label><input id="before" name="before" type="datetime-local"/></div>
    <div className={styles.actions}><button type="submit">Apply filters</button><button type="button" disabled={geoBusy} onClick={locate}>{geoBusy ? 'Locating…' : 'Use my location'}</button></div>
    </form>{geoMessage && <p role="status">{geoMessage}</p>}{locations.data?.locations.length === 0 && <p>No campus landmarks have been configured yet.</p>}<FeedResults key={JSON.stringify(filters)} filters={filters}/></>;
}
function FeedResults({ filters }: { filters: ListingFilters }) {
  const loader = useCallback(() => api.listings(filters), [filters]);
  const state = useResource(loader); const now = useClock(); const [map, setMap] = useState(false);
  return <section aria-label="Food results"><div className={styles.actions}><button onClick={() => setMap(false)} aria-pressed={!map}>List</button><button disabled={!tiles || !attribution} onClick={() => setMap(true)} aria-pressed={map}>Map</button><button onClick={state.refresh}>Refresh listings</button></div>{(!tiles || !attribution) && <p className="muted">Map tiles are unavailable. Browse the list or open directions.</p>}{state.loading && <p role="status">Loading food…</p>}{state.error && <Failure message={state.error} retry={state.refresh}/>} {state.data && <>{state.data.listings.length === 0 ? <p>No listings match these filters. Try another landmark or dietary filter.</p> : <><p role="status">{state.data.listings.length} listings</p>{map && tiles && attribution && <FoodMap listings={state.data.listings} tileUrl={tiles} attribution={attribution}/>}<div className={styles.cards}>{state.data.listings.map(listing => <FoodCard key={listing.id} listing={listing} now={now}/>)}</div></>}</>}</section>;
}
