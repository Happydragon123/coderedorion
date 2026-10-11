 'use client';
import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api-client';
import type { ListingFilters, Location, SearchRequest } from '@/lib/contracts';
import { originSchema, searchRequestSchema } from '@/lib/contracts';
import { DateTimePicker } from '@/components/shared/date-time-picker';
import { EMPTY_DATE_TIME, dateTimeToIso, type DateTimeSelection } from '@/lib/date-time';
import { Failure, FoodCard, deadline, dietaryLabels, useClock, useResource } from './common';
import styles from './student.module.css';
const FoodMap = dynamic(() => import('@/components/map/food-map'), { ssr: false, loading: () => <p className="loading-state" role="status">Loading map…</p> });
const tiles = process.env.NEXT_PUBLIC_MAP_TILE_URL;
const attribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION;
export function FoodFeed() {
  const locations = useResource(api.locations);
  const [filters, setFilters] = useState<ListingFilters>({});
  const [pickupBefore, setPickupBefore] = useState<DateTimeSelection>(EMPTY_DATE_TIME);
  const [filterError, setFilterError] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [search, setSearch] = useState<{ request: SearchRequest; version: number }>();
  const [searchError, setSearchError] = useState('');
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
    try {
      const before = dateTimeToIso(pickupBefore);
      if (before) next.pickup_before = before;
    } catch (error) {
      setFilterError(error instanceof Error ? error.message : 'Choose a complete pickup deadline or clear it.');
      return;
    }
    setFilterError('');
    setFilters(next);
    setSearch(undefined);
    setSearchError('');
  }
  function searchFood(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get('query') ?? '').trim();
    const parsed = searchRequestSchema.safeParse({ query, ...(origin ? { origin } : {}), ...(pickupLocation ? { location_id: pickupLocation } : {}) });
    if (!parsed.success) { setSearchError('Enter a food request between 1 and 1,000 characters.'); return; }
    setSearchError('');
    setSearch(previous => ({ request: parsed.data, version: (previous?.version ?? 0) + 1 }));
  }
  return <><section className={styles.searchPanel} aria-labelledby="search-heading"><h2 id="search-heading">Find something good</h2>
      <form className={styles.searchForm} onSubmit={searchFood}>
        <label htmlFor="food-query">Food request</label>
        <input id="food-query" name="query" type="text" required maxLength={1000} placeholder="Vegetarian food at Student Center South" aria-describedby="search-help"/>
        <p id="search-help">Search by food or landmark. For exact dietary, distance and deadline choices, open the filters below.</p>
        <p className="muted">AI search sends your request and selected location to Gemini. Check organizer-confirmed details before reserving.</p>
        <div className={styles.actions}><button type="submit">Search food</button>{search && <button type="button" onClick={() => { setSearch(undefined); setSearchError(''); }}>Back to standard results</button>}</div>
      </form>{searchError && <p className="notice" role="alert">{searchError}</p>}
    </section><details className={styles.filterPanel}><summary>Filter by landmark, diet or pickup time</summary><form onSubmit={apply} className={styles.filters}>
    <div><label htmlFor="landmark">Pickup landmark</label><select id="landmark" name="location" value={pickupLocation} onChange={event => setPickupLocation(event.target.value)}><option value="">All landmarks</option>{locations.data?.locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div>
    <div><label htmlFor="origin">Distance from</label><select id="origin" value={origin ? (locations.data?.locations.find(l => l.latitude === origin.latitude && l.longitude === origin.longitude)?.id ?? 'device') : ''} onChange={e => { const location = locations.data?.locations.find(l => l.id === e.target.value); setOrigin(location ? { latitude: location.latitude, longitude: location.longitude } : e.target.value === 'device' ? deviceOrigin : undefined); }}><option value="">No distance origin</option>{deviceOrigin && <option value="device">Device location</option>}{locations.data?.locations.map((location: Location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div>
    <div><label htmlFor="diet">Confirmed dietary tag</label><select id="diet" name="diet"><option value="">Any / unknown included</option>{Object.entries(dietaryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <div><label htmlFor="distance">Maximum straight-line distance</label><select id="distance" name="distance" disabled={!origin}><option value="">Any distance</option><option value="805">0.5 miles</option><option value="1609">1 mile</option><option value="4828">3 miles</option></select></div>
    <div><DateTimePicker id="before" label="Pickup deadline before" value={pickupBefore} onChange={value => { setPickupBefore(value); setFilterError(''); }} clearable/></div>
    <div className={styles.actions}><button type="submit">Apply filters</button><button type="button" disabled={geoBusy} onClick={locate}>{geoBusy ? 'Locating…' : 'Use my location'}</button></div>
    </form>{filterError && <p className="notice" role="alert">{filterError}</p>}{geoMessage && <p role="status">{geoMessage}</p>}{locations.loading && <p className="loading-state" role="status">Loading landmarks…</p>}{locations.error && <Failure message={locations.error} retry={locations.refresh}/>}</details>{locations.data?.locations.length === 0 && <p>No campus landmarks have been configured yet.</p>}<FeedResults key={search ? `search:${JSON.stringify(search)}` : `filters:${JSON.stringify(filters)}`} filters={filters} search={search?.request} locations={locations.data?.locations ?? []}/></>;
}
function FeedResults({ filters, search, locations }: { filters: ListingFilters; search?: SearchRequest; locations: Location[] }) {
  const loader = useCallback(async () => {
    if (search) return api.search(search);
    return { ...await api.listings(filters), summary: undefined, filters: undefined };
  }, [filters, search]);
  const state = useResource(loader); const now = useClock(); const [map, setMap] = useState(false);
  return <section className={styles.results} aria-label="Food results" aria-busy={state.loading}><div className={styles.resultHeading}><h2>Available food</h2><div className={styles.actions}>{tiles && attribution && <><button onClick={() => setMap(false)} aria-pressed={!map}>List</button><button onClick={() => setMap(true)} aria-pressed={map}>Map</button></>}<button className={styles.secondary} disabled={state.loading} onClick={state.refresh}>{search ? 'Refresh search' : 'Refresh listings'}</button></div></div>{state.loading && <p className="loading-state" role="status">{search ? 'Interpreting your request and finding food… This may take up to 45 seconds.' : 'Loading food…'}</p>}{state.error && <Failure message={search ? `${state.error} You can still use the filters to browse without AI.` : state.error} retry={state.refresh}/>} {state.data && <>{search && <div className="panel" role="status"><h2>Search results</h2><p>Request: {search.query}</p><p className={styles.summary}>{state.data.summary}</p>{state.data.filters && <InterpretedFilters filters={state.data.filters} locations={locations}/>}</div>}{state.data.listings.length === 0 ? <div className="empty-state"><h3>No food found this time</h3><p>{search ? 'No available listings match your request. Try a broader request or use standard filters.' : 'No listings match these filters. Try another landmark or dietary filter.'}</p></div> : <><p role="status">{state.data.listings.length} listings</p>{map && tiles && attribution && <FoodMap listings={state.data.listings} tileUrl={tiles} attribution={attribution}/>}<div className={styles.cards}>{state.data.listings.map(listing => <FoodCard key={listing.id} listing={listing} now={now}/>)}</div></>}</>}</section>;
}

function InterpretedFilters({ filters, locations }: { filters: ListingFilters; locations: Location[] }) {
  const descriptions: string[] = [];
  if (filters.location_id) descriptions.push(`Landmark: ${locations.find(location => location.id === filters.location_id)?.name ?? 'Selected campus landmark'}`);
  if (filters.dietary_tag) descriptions.push(`Confirmed dietary tag: ${dietaryLabels[filters.dietary_tag]}`);
  if (filters.max_distance_m !== undefined) descriptions.push(`Maximum straight-line distance: ${filters.max_distance_m.toLocaleString()} meters`);
  if (filters.origin_lat !== undefined && filters.origin_lng !== undefined) descriptions.push('Distances measured from the search origin');
  if (filters.pickup_before) descriptions.push(`Pickup deadline before: ${deadline(filters.pickup_before)}`);
  return <><h3>Applied search filters</h3>{descriptions.length ? <ul>{descriptions.map(description => <li key={description}>{description}</li>)}</ul> : <p>No additional filters applied.</p>}</>;
}
