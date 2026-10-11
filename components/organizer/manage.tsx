'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import type { Listing } from '@/lib/contracts';
import { deadline, message } from './common';
import styles from './organizer.module.css';
export function ManageListings({ listingId }: { listingId?: string }) {
  const [now, setNow] = useState(() => Date.now());
  const [rows, setRows] = useState<Listing[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [code, setCode] = useState('');
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
  async function act(row: Listing, collect: boolean) {
    setBusy(true); setError(''); setNotice('');
    try {
      if (collect) { const { reservation } = await api.collect(row.id, code); setNotice(`Pickup confirmed (${reservation.status}). One collected reservation counts once toward impact.`); setCode(''); }
      else { await api.patchListing(row.id, { status: 'closed' }); setNotice('Listing closed. Existing reservations remain valid until the pickup deadline.'); }
      await refresh();
    } catch (e) { setError(message(e)); await refresh(); setError(message(e)); } finally { setBusy(false); }
  }
  const selected = listingId ? rows.filter(row => row.id === listingId) : rows;
  return <>
    <div className={styles.toolbar}><p>Closing stops new reservations. Existing pickups stay valid until the deadline.</p><button className="button-secondary" onClick={() => void refresh()} disabled={loading || busy}>Refresh</button></div>
    {loading && <p className="loading-state" role="status">Loading your listings…</p>}{error && <p className="notice" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
    {!loading && !error && !selected.length && <div className="empty-state"><h2>{listingId ? 'Listing unavailable' : 'Ready to share something?'}</h2><p>{listingId ? 'This listing is unavailable or is not owned by your account.' : 'Your shared food will appear here, ready for you to manage pickups.'}</p><Link className="button" href="/share">Share food</Link></div>}
    <div className={`${styles.listings} ${listingId ? styles.listingDetail : ''}`}>{selected.map(row => <article className={styles.listing} key={row.id}>
      <span className={`${styles.status} ${row.status === 'closed' || Date.parse(row.pickup_deadline) <= now ? styles.statusClosed : ''}`}>{Date.parse(row.pickup_deadline) <= now ? 'Expired' : row.status}</span>
      <h2><Link href={`/manage/${row.id}`}>{row.title}</Link></h2>
      <p className={styles.metadata}>{row.location.name}</p>
      <div className={styles.count}><strong>{row.available_portions}</strong> available <span className="muted">of {row.portions_total} portions posted</span></div>
      <p className={styles.metadata}>Pickup by {deadline(row.pickup_deadline)} (America/Chicago)</p>
      {listingId && <p>{row.pickup_instructions}</p>}
      <div className={styles.actions}>{!listingId && <Link className="button button-secondary" href={`/manage/${row.id}`}>Manage pickup</Link>}{row.status === 'open' && <button className="button-secondary" disabled={busy} onClick={() => void act(row, false)}>Close listing</button>}</div>
      {listingId && <form className={styles.collection} onSubmit={e => { e.preventDefault(); void act(row, true); }}>
        <h3>Confirm a pickup</h3><label htmlFor="pickup-code">Student pickup code</label><input id="pickup-code" value={code} onChange={e => setCode(e.target.value)} required maxLength={32} autoComplete="off" placeholder="Enter the student’s code"/>
        <button disabled={busy || !code.trim() || Date.parse(row.pickup_deadline) <= now}>Confirm collection</button><p className={styles.help}>Confirm after handing over one portion. Each collection counts once.</p>
      </form>}
    </article>)}</div>
  </>;
}
