 'use client';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import type { Reservation } from '@/lib/contracts';
import { directionsUrl } from '@/lib/geo';
import { Failure, Dietary, availability, deadline, errorMessage, useClock, useResource } from './common';
import { ListingPhoto } from './listing-photo';
import styles from './student.module.css';
export function ListingDetail({ id }: { id: string }) {
  const loader = useCallback(() => api.listing(id), [id]); const state = useResource(loader); const now = useClock(); const router = useRouter();
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [reservation, setReservation] = useState<Reservation>();
  async function reserve() {
    setBusy(true); setError('');
    try { const result = await api.reserve(id); setReservation(result.reservation); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { state.refresh(); router.refresh(); setBusy(false); }
  }
  return <><Link className={styles.backLink} href="/listings">← All food</Link>{state.loading && <p className="loading-state" role="status">Loading listing…</p>}{state.error && <Failure message={state.error} retry={state.refresh}/>} {state.data && (() => { const listing = state.data.listing; const status = availability(listing, now); return <><div className="page-heading"><p className="eyebrow">Shared on campus</p><h1>{listing.title}</h1></div><ListingPhoto key={listing.photo_path} path={listing.photo_path} title={listing.title}/><p>{listing.description}</p><Dietary listing={listing}/><section className={styles.detailPanel}><h2>Pickup details</h2><p><span className={styles.status} data-state={listing.status !== 'open' || listing.available_portions === 0 || Date.parse(listing.pickup_deadline) <= now ? 'inactive' : 'available'}>{status}</span></p><dl><dt>Landmark</dt><dd>{listing.location.name}</dd><dt>Pickup by</dt><dd>{deadline(listing.pickup_deadline)}</dd><dt>Instructions</dt><dd>{listing.pickup_instructions}</dd><dt>Ingredients</dt><dd>{listing.ingredients_notes || 'Unknown / not provided'}</dd><dt>Allergens</dt><dd>{listing.allergen_notes || 'Unknown / not provided. Ask the organizer before eating.'}</dd></dl><p><a className="button button-secondary" href={directionsUrl(listing.location)} target="_blank" rel="noreferrer">Open in Google Maps</a></p><button disabled={busy || !!reservation || listing.status !== 'open' || listing.available_portions < 1 || Date.parse(listing.pickup_deadline) <= now} onClick={reserve}>{busy ? 'Reserving…' : 'Reserve one portion'}</button><p>Quantity: one portion. Reservations are confirmed by the server.</p></section></>; })()}{error && <Failure message={error}/>} {reservation && <div className={styles.detailPanel} role="status"><h2>One portion reserved</h2><p>View your private pickup code and cancellation options:</p><Link className="button" href="/my-pickups">Go to my pickups</Link></div>}</>;
}
