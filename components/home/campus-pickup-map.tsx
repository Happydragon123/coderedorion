'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiClientError } from '@/lib/api-client';
import type { Listing, Location } from '@/lib/contracts';
import { groupAvailablePickups, mapLandmarks } from './pickup-data';
import styles from './campus-pickup-map.module.css';

const InteractiveCampusMap = dynamic(() => import('./interactive-campus-map'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading} role="status">Loading campus map…</div>,
});
type MapData = { status: 'loading' | 'ready' | 'signed-out' | 'error'; listings: Listing[]; locations: Location[] };

export function CampusPickupMap() {
  const [data, setData] = useState<MapData>({ status: 'loading', listings: [], locations: [] });
  const [version, setVersion] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let cancelled = false;
    Promise.all([api.listings(), api.locations()]).then(([food, campus]) => {
      if (!cancelled) setData({ status: 'ready', listings: food.listings, locations: campus.locations });
    }).catch(error => {
      if (!cancelled) setData({ status: error instanceof ApiClientError && error.status === 401 ? 'signed-out' : 'error', listings: [], locations: [] });
    });
    return () => { cancelled = true; };
  }, [version]);
  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 15000);
    const refresh = window.setInterval(() => { if (document.visibilityState === 'visible') setVersion(value => value + 1); }, 60000);
    const onFocus = () => { setNow(Date.now()); setVersion(value => value + 1); };
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(clock); window.clearInterval(refresh); window.removeEventListener('focus', onFocus); };
  }, []);
  const spots = groupAvailablePickups(data.listings, now);
  const landmarks = mapLandmarks(data.locations, spots);
  const count = spots.reduce((total, spot) => total + spot.portions, 0);

  return <section className={styles.section} aria-labelledby="campus-map-heading">
    <div className={styles.heading}><div><p className="eyebrow">University of Houston</p><h2 id="campus-map-heading">Your next pickup, on campus.</h2></div><span className={styles.campusLabel}>UH</span></div>
    <div className={styles.mapFrame} aria-label="Campus pickup map">
      <InteractiveCampusMap landmarks={landmarks} spots={spots} availabilityKnown={data.status === 'ready'}/>
    </div>
    <div className={styles.legend} aria-label="Map legend"><span><svg className={styles.legendPin} viewBox="0 0 32 40" aria-hidden="true"><path d="M16 1C8 1 2 7 2 15c0 10 14 24 14 24s14-14 14-24C30 7 24 1 16 1Z" fill="currentColor"/><circle cx="16" cy="15" r="5" fill="white"/></svg>Pickup location</span>{data.status === 'ready' && <span>Number on pin = available portions</span>}</div>
    <div className={styles.inventory} aria-live="polite">
      {data.status === 'loading' && <p role="status">Checking available pickups…</p>}
      {data.status === 'signed-out' && <p>Explore campus pickup locations. <Link href="/sign-in">Sign in</Link> to see currently available food.</p>}
      {data.status === 'error' && <p role="status">Available pickups could not load. Try refreshing or <Link href="/listings">browse food listings</Link>.</p>}
      {data.status === 'ready' && <>
        <p className={styles.summary}>{spots.length ? `${count} ${count === 1 ? 'portion' : 'portions'} · ${spots.length} pickup ${spots.length === 1 ? 'spot' : 'spots'}` : 'No food available right now. Check back soon.'}</p>
        {spots.length > 0 && <ul className={styles.pickupList}>{spots.map(spot => <li key={spot.location.id}><span className={styles.redDot} aria-hidden="true"/><div><strong>{spot.location.name}</strong>{spot.listings.map(listing => <Link key={listing.id} href={`/listings/${listing.id}`}>{listing.title} <span>· {listing.available_portions} portions</span></Link>)}</div></li>)}</ul>}
      </>}
    </div>
    <div className={styles.footer}><span>Tap a red pin to explore a pickup spot.</span><button className={styles.refresh} type="button" disabled={data.status === 'loading'} onClick={() => { setNow(Date.now()); setData({ status: 'loading', listings: [], locations: data.locations }); setVersion(value => value + 1); }}>Refresh pickups</button></div>
    <details className={styles.landmarkList}><summary>Campus pickup locations</summary><ul>{landmarks.map(landmark => <li key={landmark.name}><a href={landmark.google_maps_url ?? `https://www.google.com/maps/dir/?api=1&destination=${landmark.latitude},${landmark.longitude}`} target="_blank" rel="noreferrer">{landmark.name}</a></li>)}</ul></details>
  </section>;
}
