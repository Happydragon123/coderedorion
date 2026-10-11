'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { pickupState } from '@/lib/pickup-state';
import { directionsUrl } from '@/lib/geo';
import { Failure, Dietary, availability, deadline, errorMessage, useClock, useResource } from './common';
import { ListingPhoto } from './listing-photo';
import { SharerIdentity } from '@/components/shared/sharer-identity';
import { PickupActions } from './pickup-actions';
import styles from './student.module.css';

export function ListingDetail({ id }: { id: string }) {
  // Never carry another listing's ownership/pickup state across a route change.
  return <ListingDetailContent key={id} id={id}/>;
}

function ListingDetailContent({ id }: { id: string }) {
  const loader = useCallback(async () => {
    const [{ listing }, context] = await Promise.all([api.listing(id), api.pickupContext(id)]);
    return { listing, context };
  }, [id]);
  const state = useResource(loader);
  const now = useClock();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { refresh } = state;
  useEffect(() => {
    const onFocus = () => { if (!busy && document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh, busy]);

  async function reserve() {
    if (busy || !state.data || !pickupState(state.data.listing, state.data.context, Date.now()).canReserve) return;
    setBusy(true); setError(''); setNotice('');
    try { await api.reserve(id); setNotice('Your reservation was saved. Open My pickups for your current status and private code.'); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { refresh(); router.refresh(); setBusy(false); }
  }

  return <>
    <Link className={styles.backLink} href="/listings">← All food</Link>
    {state.loading && <p className="loading-state" role="status">Loading listing and your pickup status…</p>}
    {state.error && <Failure message={state.error} retry={refresh}/>}
    {state.data && (() => {
      const { listing, context } = state.data;
      const inactive = listing.status !== 'open' || listing.available_portions === 0 || Date.parse(listing.pickup_deadline) <= now;
      return <>
        <div className="page-heading"><p className="eyebrow">Shared on campus</p><h1>{listing.title}</h1><SharerIdentity identity={listing.sharer}/></div>
        <ListingPhoto key={listing.photo_path} path={listing.photo_path} title={listing.title}/>
        <p>{listing.description}</p><Dietary listing={listing}/>
        <section className={styles.detailPanel}>
          <h2>Pickup details</h2><p><span className={styles.status} data-state={inactive ? 'inactive' : 'available'}>{availability(listing, now)}</span></p>
          <dl><dt>Landmark</dt><dd>{listing.location.name}</dd><dt>Pickup by</dt><dd>{deadline(listing.pickup_deadline)}</dd><dt>Instructions</dt><dd>{listing.pickup_instructions}</dd><dt>Ingredients</dt><dd>{listing.ingredients_notes || 'Unknown / not provided'}</dd><dt>Allergens</dt><dd>{listing.allergen_notes || 'Unknown / not provided. Ask the organizer before eating.'}</dd></dl>
          <p><a className="button button-secondary" href={directionsUrl(listing.location)} target="_blank" rel="noreferrer">Open in Google Maps</a></p>
          <PickupActions listing={listing} context={context} now={now} busy={busy} onReserve={() => void reserve()}/>
        </section>
      </>;
    })()}
    {error && <p className="notice" role="alert">{error}</p>}
    {notice && <div className="notice" role="status"><p>{notice}</p><Link href="/my-pickups">Go to my pickups</Link></div>}
  </>;
}
