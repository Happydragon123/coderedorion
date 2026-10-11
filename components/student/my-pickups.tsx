 'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import type { Listing, Reservation } from '@/lib/contracts';
import { Failure, deadline, errorMessage, useClock, useResource } from './common';
import styles from './student.module.css';
async function loadPickups() {
  const { reservations } = await api.myReservations();
  const ids = [...new Set(reservations.map(r => r.listing_id))];
  const results = await Promise.allSettled(ids.map(id => api.listing(id)));
  const listings = new Map<string, Listing>();
  results.forEach((result, index) => { if (result.status === 'fulfilled') listings.set(ids[index], result.value.listing); });
  return { reservations, listings };
}
export function MyPickups() {
  const state = useResource(loadPickups); const router = useRouter(); const now = useClock(); const [busy, setBusy] = useState<string>(); const [message, setMessage] = useState('');
  async function cancel(reservation: Reservation) {
    setBusy(reservation.id); setMessage('');
    try { await api.cancel(reservation.id); setMessage('Pickup updated. Availability has been refreshed.'); }
    catch (error) { setMessage(errorMessage(error)); }
    finally { state.refresh(); router.refresh(); setBusy(undefined); }
  }
  return <><button className={styles.secondary} onClick={state.refresh}>Refresh pickups</button>{state.loading && <p role="status">Loading private pickups…</p>}{state.error && <Failure message={state.error} retry={state.refresh}/>} {message && <p className="notice" role="status">{message}</p>}{state.data && (state.data.reservations.length === 0 ? <p>No pickups yet. <Link href="/listings">Find food</Link> to reserve one portion.</p> : <div className={styles.cards}>{state.data.reservations.map(reservation => {
    const listing = state.data!.listings.get(reservation.listing_id);
    const status = reservation.status === 'reserved' && listing && Date.parse(listing.pickup_deadline) <= now ? 'expired' : reservation.status;
    return <article className={styles.card} key={reservation.id}><h2><Link href={`/listings/${reservation.listing_id}`}>{listing?.title ?? 'Pickup listing'}</Link></h2><span className={styles.status}>{status}</span>{listing ? <><p>{listing.location.name} · Pickup by {deadline(listing.pickup_deadline)}</p><p>{listing.pickup_instructions}</p></> : <p className="notice">Listing details could not load. Refresh to check the deadline and instructions.</p>}{status === 'reserved' && listing && <><p>Private pickup code</p><code className={styles.code}>{reservation.pickup_code}</code><p>Share only with your pickup organizer.</p></>}{status === 'reserved' && <button disabled={!!busy} onClick={() => cancel(reservation)}>{busy === reservation.id ? 'Cancelling…' : 'Cancel pickup'}</button>}{status === 'collected' && reservation.collected_at && <p>Collected {deadline(reservation.collected_at)}</p>}</article>;
  })}</div>)}</>;
}
