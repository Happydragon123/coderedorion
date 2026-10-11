 'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ApiClientError } from '@/lib/api-client';
import type { Listing } from '@/lib/contracts';
import { SharerIdentity } from '@/components/shared/sharer-identity';
import { directionsUrl, formatDistance } from '@/lib/geo';
import styles from './student.module.css';
import { ListingPhoto } from './listing-photo';
export const dietaryLabels = { vegetarian: 'Vegetarian', vegan: 'Vegan', halal: 'Halal', gluten_free: 'Gluten-free' };
export function errorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.status === 401) return 'Your session has ended. Sign in again to continue.';
    if (error.status === 409) return `Availability changed or you already have a pickup. ${error.message}`;
    return error.message;
  }
  return 'Unable to reach the service. Please try again.';
}
export function Failure({ message, retry, sessionExpired = false }: { message: string; retry?: () => void; sessionExpired?: boolean }) { return <div className="notice" role="alert"><p>{message}</p>{sessionExpired ? <Link href="/sign-in">Sign in</Link> : <Link href="/listings">Browse food</Link>}{!sessionExpired && retry && <button onClick={retry}>Try again</button>}</div>; }
export function useResource<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<{ data?: T; error?: string; sessionExpired?: boolean; loading: boolean }>({ loading: true });
  const [version, setVersion] = useState(0);
  const pending = useRef<{ loader: () => Promise<T>; version: number; promise: Promise<T> } | undefined>(undefined);
  useEffect(() => {
    let current = true;
    // Reuse the same request during React's development effect replay. AI endpoints
    // allow only one in-flight request per user; refresh still starts a new request.
    if (!pending.current || pending.current.loader !== loader || pending.current.version !== version) {
      pending.current = { loader, version, promise: Promise.resolve().then(loader) };
    }
    pending.current.promise.then(data => { if (current) setState({ data, loading: false }); }).catch(error => { if (current) setState({ error: errorMessage(error), sessionExpired: error instanceof ApiClientError && error.status === 401, loading: false }); });
    return () => { current = false; };
  }, [loader, version]);
  return { ...state, refresh: () => { setState({ loading: true }); setVersion(v => v + 1); } };
}
export function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(timer); }, []);
  return now;
}
export function deadline(value: string) { return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value)); }
export function availability(listing: Listing, now: number) { return Date.parse(listing.pickup_deadline) <= now ? 'Expired' : listing.status === 'closed' ? 'Closed' : listing.available_portions === 0 ? 'Sold out' : `${listing.available_portions} portions available`; }
export function Dietary({ listing }: { listing: Listing }) { return <div className={styles.tags}>{listing.dietary_tags.length ? listing.dietary_tags.map(tag => <span className={styles.tag} key={tag}>{dietaryLabels[tag]} · organizer-confirmed</span>) : <span>Dietary information unknown / unconfirmed</span>}</div>; }
export function FoodCard({ listing, now, viewerId }: { listing: Listing; now: number; viewerId?: string }) {
  const own = viewerId === listing.organizer_id;
  return <article className={styles.card}>
    <ListingPhoto path={listing.photo_path} title={listing.title} variant="card"/>
    {own && <p className="eyebrow">Your listing</p>}
    <span className={styles.status} data-state={listing.status !== 'open' || listing.available_portions === 0 || Date.parse(listing.pickup_deadline) <= now ? 'inactive' : 'available'}>{availability(listing, now)}</span>
    <h2><Link href={`/listings/${listing.id}`}>{listing.title}</Link></h2><SharerIdentity identity={listing.sharer}/>
    <dl className={styles.cardMeta}><dt>Pickup landmark</dt><dd>{listing.location.name}</dd><dt>Pickup by</dt><dd>{deadline(listing.pickup_deadline)}</dd></dl>
    <Dietary listing={listing}/>
    <div className={styles.cardFooter}><Link href={own ? `/manage/${listing.id}` : `/listings/${listing.id}`}>{own ? 'Manage listing' : 'View food →'}</Link><a href={directionsUrl(listing.location)} target="_blank" rel="noreferrer">Open in Google Maps</a>{listing.distance_m !== undefined && <small>{formatDistance(listing.distance_m)}</small>}</div>
  </article>;
}
