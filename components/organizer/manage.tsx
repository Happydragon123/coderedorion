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
  return <><p>Closing stops new reservations. Honor existing pickups until the deadline.</p><button onClick={() => void refresh()} disabled={loading || busy}>Refresh</button>{loading && <p role="status">Loading your listings…</p>}{error && <p className="notice" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}{!loading && !error && !selected.length && <p>{listingId ? 'This listing is unavailable or is not owned by your account.' : 'You have no listings yet.'} <Link href="/share">Share food</Link></p>}{selected.map(row => <article className={`panel ${styles.listing}`} key={row.id}><h2><Link href={`/manage/${row.id}`}>{row.title}</Link></h2><p>{row.location.name} · {row.status} · {row.available_portions} available of {row.portions_total} posted</p><p>Pickup by {deadline(row.pickup_deadline)} (America/Chicago)</p><p>{row.pickup_instructions}</p><div className={styles.actions}>{row.status === 'open' && <button disabled={busy} onClick={() => void act(row, false)}>Close listing</button>}</div>{listingId && <form className={styles.form} onSubmit={e => { e.preventDefault(); void act(row, true); }}><label htmlFor="pickup-code">Student pickup code</label><input id="pickup-code" value={code} onChange={e => setCode(e.target.value)} required maxLength={32} autoComplete="off"/><button disabled={busy || !code.trim() || Date.parse(row.pickup_deadline) <= now}>Confirm collection</button><p>Confirm only after handing over one portion. Repeated confirmation never counts twice.</p></form>}</article>)}</>;
}
