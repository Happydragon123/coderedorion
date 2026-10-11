'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import type { Listing } from '@/lib/contracts';
import { deadline, message } from './common';
import styles from './organizer.module.css';
import { isActiveListing, ManageQuantity } from './manage-state';
import { ListingPhoto } from '@/components/student/listing-photo';
export function ManageListings({ listingId }: { listingId?: string }) {
  const [now, setNow] = useState(() => Date.now());
  const [rows, setRows] = useState<Listing[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [code, setCode] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  const closeTrigger = useRef<HTMLButtonElement>(null);
  const [closing, setClosing] = useState<Listing | null>(null), [closeError, setCloseError] = useState('');
  const [closingBusy, setClosingBusy] = useState(false);
  useEffect(() => { if (closing) dialog.current?.showModal(); }, [closing]);
  useEffect(() => { if (notice) feedback.current?.focus(); }, [notice]);
  async function closeListing() {
    if (!closing || closingBusy) return;
    setClosingBusy(true); setCloseError(''); setNotice('');
    try {
      const { listing } = await api.patchListing(closing.id, { status: 'closed' });
      setRows(previous => previous.map(row => row.id === listing.id ? listing : row));
      setNotice(`“${listing.title}” closed. New reservations have stopped. Existing pickups remain valid until ${deadline(listing.pickup_deadline)} (America/Chicago).`);
      dialog.current?.close(); setClosing(null);
    } catch (e) { setCloseError(message(e)); } finally { setClosingBusy(false); }
  }
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows((await api.myListings()).listings); } catch (e) { setError(message(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let current = true;
    void api.myListings().then(({ listings }) => { if (current) { setRows(listings); setLoading(false); } }).catch(e => { if (current) { setError(message(e)); setLoading(false); } });
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => { current = false; clearInterval(timer); };
  }, []);
  async function act(row: Listing) {
    setBusy(true); setError(''); setNotice('');
    try {
      const { reservation } = await api.collect(row.id, code);
      setNotice(`Pickup confirmed (${reservation.status}). One collected reservation counts once toward impact.`); setCode('');
      await refresh();
    } catch (e) { setError(message(e)); await refresh(); setError(message(e)); } finally { setBusy(false); }
  }
  const selected = listingId ? rows.filter(row => row.id === listingId) : rows;
  const active = selected.filter(row => isActiveListing(row, now));
  const history = selected.filter(row => !isActiveListing(row, now));
  const groups = listingId ? [{ title: 'Listing', rows: selected }] : [{ title: 'Active listings', rows: active }, { title: 'History — closed and expired', rows: history }];
  const ListingHeading = listingId ? 'h2' : 'h3';
  return <>
    <dialog ref={dialog} className={styles.closeDialog} aria-labelledby="close-title" aria-describedby="close-description" onCancel={e => { if (closingBusy) e.preventDefault(); }} onClose={() => { setClosing(null); setCloseError(''); requestAnimationFrame(() => { if (closeTrigger.current?.isConnected) closeTrigger.current.focus(); else feedback.current?.focus(); }); }}>
      <h2 id="close-title">Close “{closing?.title}”?</h2>
      <p id="close-description">Closing stops new reservations. Existing pickups remain valid until their pickup deadline{closing ? `: ${deadline(closing.pickup_deadline)} (America/Chicago)` : ''}. You can still confirm those pickups here.</p>
      {closingBusy && <p role="status">Closing listing…</p>}
      {closeError && <p className="notice" role="alert">Could not confirm closure. {closeError} Retry to confirm the listing is closed.</p>}
      <div className={styles.actions}><button autoFocus className="button-secondary" disabled={closingBusy} onClick={() => dialog.current?.close()}>Keep listing open</button><button disabled={closingBusy} onClick={() => void closeListing()}>{closingBusy ? 'Closing…' : closeError ? 'Retry closing' : 'Confirm close'}</button></div>
    </dialog>
    <div className={styles.toolbar}><p>Closing stops new reservations. Existing pickups stay valid until the deadline.</p><button className="button-secondary" onClick={() => void refresh()} disabled={loading || busy || !!closing}>Refresh</button></div>
    {loading && <p className="loading-state" role="status">Loading your listings…</p>}{error && <p className="notice" role="alert">{error}</p>}{notice && <p ref={feedback} tabIndex={-1} className="notice" role="status">{notice}</p>}
    {!loading && !error && !selected.length && <div className="empty-state"><h2>{listingId ? 'Listing unavailable' : 'Ready to share something?'}</h2><p>{listingId ? 'This listing is unavailable or is not owned by your account.' : 'Your shared food will appear here, ready for you to manage pickups.'}</p><Link className="button" href="/share">Share food</Link></div>}
    {groups.map(group => {
    const isHistory = !listingId && group.rows === history;
    const Group = isHistory ? 'details' : 'section';
    const heading = <h2 className={styles.groupHeading}>{group.title} <span className={styles.groupCount}>({group.rows.length})</span></h2>;
    return <Group className={`${styles.manageSection} ${isHistory ? styles.historyDisclosure : ''}`} key={group.title} aria-label={group.title}>
    {!listingId && (isHistory ? <summary>{heading}</summary> : heading)}
    {!loading && !error && !listingId && !group.rows.length && <p className="muted">{group.title === 'Active listings' ? 'No active listings.' : 'No closed or expired listings yet.'}</p>}
    <div className={`${styles.listings} ${listingId ? styles.listingDetail : !isHistory ? styles.activeListings : ''}`}>{group.rows.map(row => <article className={styles.listing} key={row.id}>
      <div className={styles.listingPhoto}><ListingPhoto path={row.photo_path} title={row.title} variant={listingId ? 'detail' : 'card'}/></div>
      <div className={styles.listingBody}>
      <span className={`${styles.status} ${row.status === 'closed' || Date.parse(row.pickup_deadline) <= now ? styles.statusClosed : ''}`}>{row.status === 'closed' ? (Date.parse(row.pickup_deadline) <= now ? 'Closed · expired' : 'Closed') : Date.parse(row.pickup_deadline) <= now ? 'Expired' : 'Open'}</span>
      <ListingHeading className={styles.listingTitle}><Link href={`/manage/${row.id}`}>{row.title}</Link></ListingHeading>
      <p className={styles.metadata}>{row.location.name}</p>
      <div className={styles.count}><ManageQuantity row={row} now={now}/></div>
      <p className={styles.metadata}>Pickup by {deadline(row.pickup_deadline)} (America/Chicago)</p>
      {listingId && <p className={styles.pickupInstructions}>{row.pickup_instructions}</p>}
      {(!listingId || active.includes(row)) && <div className={`${styles.actions} ${styles.listingActions}`}>{!listingId && <Link className="button" href={`/manage/${row.id}`}>Manage pickup</Link>}{active.includes(row) && <button className="button-secondary" disabled={busy || !!closing} onClick={e => { closeTrigger.current = e.currentTarget; setCloseError(''); setClosing(row); }}>Close listing</button>}</div>}
      </div>
      {listingId && <form className={styles.collection} onSubmit={e => { e.preventDefault(); void act(row); }}>
        <h3>Confirm a pickup</h3><label htmlFor="pickup-code">Student pickup code</label><input id="pickup-code" value={code} onChange={e => setCode(e.target.value)} required maxLength={32} autoComplete="off" placeholder="Enter the student’s code"/>
        <button disabled={busy || !!closing || !code.trim() || Date.parse(row.pickup_deadline) <= now}>Confirm collection</button><p className={styles.help}>Confirm after handing over one portion. Each collection counts once.</p>
      </form>}
    </article>)}</div></Group>;
    })}
  </>;
}
