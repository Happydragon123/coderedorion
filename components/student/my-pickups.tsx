 'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiClientError } from '@/lib/api-client';
import { directionsUrl } from '@/lib/geo';
import type { Listing, Reservation } from '@/lib/contracts';
import { Failure, deadline, errorMessage, useClock, useResource } from './common';
import styles from './student.module.css';
async function loadPickups() {
  const { reservations } = await api.myReservations();
  const ids = [...new Set(reservations.map(r => r.listing_id))];
  const results = await Promise.allSettled(ids.map(id => api.listing(id)));
  const listings = new Map<string, Listing>();
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') listings.set(ids[index], result.value.listing);
    else if (result.reason instanceof ApiClientError && result.reason.status === 401) throw result.reason;
  });
  return { reservations, listings, missingDetails: ids.length - listings.size };
}
export function MyPickups() {
  const state = useResource(loadPickups); const router = useRouter(); const now = useClock(); const [busy, setBusy] = useState<string>(); const [message, setMessage] = useState('');
  async function cancel(reservation: Reservation) {
    setBusy(reservation.id); setMessage('');
    try { await api.cancel(reservation.id); setMessage('Pickup updated. Availability has been refreshed.'); }
    catch (error) { setMessage(errorMessage(error)); }
    finally { state.refresh(); router.refresh(); setBusy(undefined); }
  }
  function effectiveStatus(reservation: Reservation) {
    const listing = state.data?.listings.get(reservation.listing_id);
    return reservation.status === 'reserved' && listing && Date.parse(listing.pickup_deadline) <= now ? 'expired' : reservation.status;
  }
  const active = state.data?.reservations.filter(reservation => effectiveStatus(reservation) === 'reserved' && state.data?.listings.has(reservation.listing_id)) ?? [];
  const uncertain = state.data?.reservations.filter(reservation => effectiveStatus(reservation) === 'reserved' && !state.data?.listings.has(reservation.listing_id)) ?? [];
  const past = state.data?.reservations.filter(reservation => effectiveStatus(reservation) !== 'reserved') ?? [];
  function cards(reservations: Reservation[]) {
    return <div className={styles.cards}>{reservations.map(reservation => {
    const listing = state.data!.listings.get(reservation.listing_id);
    const status = reservation.status === 'reserved' && !listing ? 'Needs verification' : effectiveStatus(reservation);
    return <article className={styles.card} key={reservation.id}><h2><Link href={`/listings/${reservation.listing_id}`}>{listing?.title ?? 'Pickup listing'}</Link></h2><span className={styles.status} data-state={status === 'reserved' ? 'available' : 'inactive'}>{status}</span>{listing ? <><p>{listing.location.name} · Pickup by {deadline(listing.pickup_deadline)}</p><p>{listing.pickup_instructions}</p></> : <p className="notice">Listing details could not load. Refresh to check the deadline and instructions.</p>}{status === 'reserved' && listing && <><p><a className="button button-secondary" href={directionsUrl(listing.location)} target="_blank" rel="noreferrer">Open in Google Maps</a></p><p>Private pickup code</p><code className={styles.code}>{reservation.pickup_code}</code><p>Share only with your pickup organizer.</p></>}{(status === 'reserved' || status === 'Needs verification') && <button disabled={!!busy} onClick={() => cancel(reservation)}>{busy === reservation.id ? 'Cancelling…' : 'Cancel pickup'}</button>}{status === 'collected' && reservation.collected_at && <p>Collected {deadline(reservation.collected_at)}</p>}</article>;
    })}</div>;
  }
  return <><button className={styles.secondary} onClick={state.refresh}>Refresh pickups</button>{state.loading && <p className="loading-state" role="status">Loading private pickups…</p>}{state.error && <Failure sessionExpired={state.sessionExpired} message={state.error} retry={state.refresh}/>} {message && <p className="notice" role="status">{message}</p>}{state.data && <>{state.data.missingDetails > 0 && <div className="notice" role="alert"><p>Some pickup details could not load. Retry to check current deadlines and instructions.</p><button onClick={state.refresh}>Retry missing details</button></div>}<section aria-label="Active pickups">{active.length ? cards(active) : <div className="empty-state"><h2>Your next pickup starts here.</h2><p>No verified active pickups. Browse campus food and reserve one portion.</p><Link className="button" href="/listings">Find food</Link></div>}</section>{uncertain.length > 0 && <section aria-label="Pickups needing verification"><h2>Pickups needing verification</h2><p className="notice" role="alert">Some listing details could not load. These pickups are not confirmed current until their deadlines can be checked.</p>{cards(uncertain)}</section>}{past.length > 0 && <details className={styles.filterPanel}><summary>Past pickups ({past.length})</summary>{cards(past)}</details>}</>}</>;
}
