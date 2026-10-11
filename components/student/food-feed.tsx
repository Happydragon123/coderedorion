 'use client';
import dynamic from 'next/dynamic';
import { useCallback, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import type { ListingFilters, Location, SearchRequest } from '@/lib/contracts';
import { searchRequestSchema } from '@/lib/contracts';
import { EMPTY_DATE_TIME, dateTimeToIso, type DateTimeSelection } from '@/lib/date-time';
import { Failure, FoodCard, deadline, dietaryLabels, useClock, useResource } from './common';
import styles from './student.module.css';
const FoodMap = dynamic(() => import('@/components/map/food-map'), { ssr: false, loading: () => <p className="loading-state" role="status">Loading map…</p> });
const tiles = process.env.NEXT_PUBLIC_MAP_TILE_URL;
const attribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION;
export function FoodFeed({ viewerId }: { viewerId: string }) {
  const locations = useResource(api.locations);
  const searchForm = useRef<HTMLFormElement>(null);
  const filterForm = useRef<HTMLFormElement>(null);
  const [browseVersion, setBrowseVersion] = useState(0);
  function clearFilters() {
    searchForm.current?.reset();
    filterForm.current?.reset();
    setFilters({});
    setPickupBefore(EMPTY_DATE_TIME);
    setPickupLocation('');
    setFilterError('');
    setSearch(undefined);
    setSearchError('');
    // Remount even when filters were already empty: discard search data/errors
    // and refresh standard browsing. useResource ignores the unmounted request.
    setBrowseVersion(version => version + 1);
  }
  const [filters, setFilters] = useState<ListingFilters>({});
  const [pickupBefore, setPickupBefore] = useState<DateTimeSelection>(EMPTY_DATE_TIME);
  const [filterError, setFilterError] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [search, setSearch] = useState<{ request: SearchRequest; version: number }>();
  const [searchError, setSearchError] = useState('');
  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const next: ListingFilters = {};
    if (data.get('location')) next.location_id = String(data.get('location'));
    if (data.get('diet')) next.dietary_tag = String(data.get('diet')) as ListingFilters['dietary_tag'];
    try {
      const selected = [pickupBefore.date, pickupBefore.hour, pickupBefore.period];
      if (selected.some(Boolean) && !selected.every(Boolean)) throw new Error('Choose a date, hour and AM or PM.');
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
    const parsed = searchRequestSchema.safeParse({ query, ...(pickupLocation ? { location_id: pickupLocation } : {}) });
    if (!parsed.success) { setSearchError('Enter a food request between 1 and 1,000 characters.'); return; }
    setSearchError('');
    setSearch(previous => ({ request: parsed.data, version: (previous?.version ?? 0) + 1 }));
  }
  return <><section className={styles.searchPanel} aria-labelledby="search-heading"><h2 id="search-heading">Find something good</h2>
      <form ref={searchForm} className={styles.searchForm} onSubmit={searchFood}>
        <label htmlFor="food-query">Food request</label>
        <input id="food-query" name="query" type="text" required maxLength={1000} placeholder="Vegetarian food at Student Center South" aria-describedby="search-help"/>
        <p id="search-help">Try a cuisine, dish or texture, such as “Indian food” or “creamy pasta.” Search compares listing titles and descriptions. For exact dietary, landmark and deadline choices, open the filters below.</p>
        <p className="muted">AI search sends your request, selected location and available listing titles/descriptions to Gemini. Check organizer-confirmed details before reserving.</p>
        <div className={styles.actions}><button type="submit">Search food</button><button type="button" className={styles.secondary} onClick={clearFilters}>Clear filters</button>{search && <button type="button" onClick={() => { setSearch(undefined); setSearchError(''); }}>Back to standard results</button>}</div>
      </form>{searchError && <p className="notice" role="alert">{searchError}</p>}
    </section><details className={styles.filterPanel}><summary>Filter by landmark, diet or pickup time</summary><form ref={filterForm} onSubmit={apply} className={styles.filters}>
    <div><label htmlFor="landmark">Pickup landmark</label><select id="landmark" name="location" disabled={locations.loading || !!locations.error} value={pickupLocation} onChange={event => setPickupLocation(event.target.value)}><option value="">{locations.loading ? 'Loading landmarks…' : locations.error ? 'Landmarks unavailable' : 'All landmarks'}</option>{locations.data?.locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div>
    <div><label htmlFor="diet">Confirmed dietary tag</label><select id="diet" name="diet"><option value="">Any / unknown included</option>{Object.entries(dietaryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <PickupDeadlineFilter value={pickupBefore} onChange={value => { setPickupBefore(value); setFilterError(''); }}/>
    <div className={styles.filterActions}><button type="submit">Apply filters</button></div>
    </form>{filterError && <p className="notice" role="alert">{filterError}</p>}{locations.loading && <p className="loading-state" role="status">Loading landmarks…</p>}{locations.error && <Failure sessionExpired={locations.sessionExpired} message={locations.error} retry={locations.refresh}/>}</details>{locations.data?.locations.length === 0 && <p>No campus landmarks have been configured yet.</p>}<FeedResults key={search ? `search:${JSON.stringify(search)}` : `filters:${browseVersion}:${JSON.stringify(filters)}`} viewerId={viewerId} filters={filters} search={search?.request} locations={locations.data?.locations ?? []}/></>;
}
function PickupDeadlineFilter({ value, onChange }: { value: DateTimeSelection; onChange: (value: DateTimeSelection) => void }) {
  function update(key: 'date' | 'hour' | 'period', next: string) {
    const selection = { ...value, [key]: next };
    selection.minute = [selection.date, selection.hour, selection.period].some(Boolean) ? '00' : '';
    onChange(selection);
  }
  return <div className={styles.deadlineFilter} role="group" aria-labelledby="before-label">
    <div className={styles.deadlineHeading}><span id="before-label">Pickup deadline before</span><button type="button" className={styles.clearDeadline} onClick={() => onChange({ ...EMPTY_DATE_TIME })} aria-label="Clear pickup deadline before">Clear time</button></div>
    <div className={styles.deadlineControls}>
      <div><label htmlFor="before-date">Date</label><input id="before-date" type="date" value={value.date} onChange={event => update('date', event.target.value)}/></div>
      <div><label htmlFor="before-hour">Hour</label><select id="before-hour" value={value.hour} onChange={event => update('hour', event.target.value)}><option value="">—</option>{Array.from({ length: 12 }, (_, i) => String(i + 1)).map(hour => <option key={hour} value={hour}>{hour}</option>)}</select></div>
      <div><label htmlFor="before-period">AM / PM</label><select id="before-period" value={value.period} onChange={event => update('period', event.target.value)}><option value="">—</option><option value="AM">AM</option><option value="PM">PM</option></select></div>
    </div>
  </div>;
}

function FeedResults({ filters, search, locations, viewerId }: { filters: ListingFilters; search?: SearchRequest; locations: Location[]; viewerId: string }) {
  const loader = useCallback(async () => {
    if (search) return api.search(search);
    return { ...await api.listings(filters), summary: undefined, filters: undefined };
  }, [filters, search]);
  const state = useResource(loader); const now = useClock(); const [map, setMap] = useState(false);
  return <>{search && <div className={styles.searchProgress} role="status" aria-live="polite" aria-atomic="true">{state.loading ? <><strong>Searching for food…</strong><p>Interpreting your request and checking available food. This may take up to 45 seconds.</p><p>You can use Clear filters to return to standard browsing.</p></> : state.error ? 'Search could not finish. Browse with standard filters or try again below.' : 'Search complete. Results are below.'}</div>}<section className={styles.results} aria-label="Food results" aria-busy={state.loading}><div className={styles.resultHeading}><h2>Available food</h2><div className={styles.actions}>{tiles && attribution && <><button onClick={() => setMap(false)} aria-pressed={!map}>List</button><button onClick={() => setMap(true)} aria-pressed={map}>Map</button></>}<button className={styles.secondary} disabled={state.loading} onClick={state.refresh}>{search ? 'Refresh search' : 'Refresh listings'}</button></div></div>{state.loading && !search && <p className="loading-state" role="status">Loading food…</p>}{state.error && <Failure sessionExpired={state.sessionExpired} message={search ? `${state.error} You can still use the filters to browse without AI.` : state.error} retry={state.refresh}/>} {state.data && <>{search && <div className="panel" role="status"><h2>Search results</h2><p>Request: {search.query}</p><p className={styles.summary}>{state.data.summary}</p>{state.data.filters && <InterpretedFilters filters={state.data.filters} locations={locations}/>}</div>}{state.data.listings.length === 0 ? <div className="empty-state"><h3>No food found this time</h3><p>{search ? 'No matching food found in the available listings. Try another food request or use standard filters.' : 'No listings match these filters. Try another landmark or dietary filter.'}</p></div> : <><p role="status">{state.data.listings.length} listings</p>{map && tiles && attribution && <FoodMap listings={state.data.listings} tileUrl={tiles} attribution={attribution}/>}<div className={styles.cards}>{state.data.listings.map(listing => <FoodCard key={listing.id} listing={listing} now={now} viewerId={viewerId}/>)}</div></>}</>}</section></>;
}

function InterpretedFilters({ filters, locations }: { filters: ListingFilters; locations: Location[] }) {
  const descriptions: string[] = [];
  if (filters.location_id) descriptions.push(`Landmark: ${locations.find(location => location.id === filters.location_id)?.name ?? 'Selected campus landmark'}`);
  if (filters.dietary_tag) descriptions.push(`Confirmed dietary tag: ${dietaryLabels[filters.dietary_tag]}`);
  if (filters.max_distance_m !== undefined) descriptions.push(`Maximum straight-line distance: ${filters.max_distance_m.toLocaleString()} meters`);
  if (filters.origin_lat !== undefined && filters.origin_lng !== undefined) descriptions.push('Distances measured from the search origin');
  if (filters.pickup_before) descriptions.push(`Pickup deadline before: ${deadline(filters.pickup_before)}`);
  return <><h3>Applied search filters</h3>{descriptions.length ? <ul>{descriptions.map(description => <li key={description}>{description}</li>)}</ul> : <p>No additional filters applied. Results are selected by food relevance from listing titles and descriptions.</p>}</>;
}
