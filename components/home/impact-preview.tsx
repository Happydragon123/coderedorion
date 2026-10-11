'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiClientError } from '@/lib/api-client';
import { estimateCollectedImpact } from '@/lib/impact-estimates';

type PreviewState =
  | { status: 'loading' | 'signed-out' | 'error' }
  | { status: 'ready'; collectedPortions: number; poundsRedistributed: number };

export function ImpactPreview() {
  const [state, setState] = useState<PreviewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    api.impact().then(impact => {
      if (cancelled) return;
      const estimate = estimateCollectedImpact(impact.collected_portions);
      setState({ status: 'ready', collectedPortions: impact.collected_portions, poundsRedistributed: estimate.poundsRedistributed });
    }).catch(error => {
      if (!cancelled) setState({ status: error instanceof ApiClientError && error.status === 401 ? 'signed-out' : 'error' });
    });
    return () => { cancelled = true; };
  }, []);

  return <section className="home-impact" aria-labelledby="home-impact-title">
    <div>
      <p className="eyebrow">Campus impact</p>
      <h2 id="home-impact-title">Small pickups add up.</h2>
    </div>
    <div className="home-impact-stat" aria-live="polite">
      {state.status === 'loading' && <p role="status">Calculating our shared impact…</p>}
      {state.status === 'ready' && <><strong>≈{state.poundsRedistributed.toLocaleString(undefined, { maximumFractionDigits: 1 })} lb</strong><span>of food redistributed across {state.collectedPortions.toLocaleString()} confirmed {state.collectedPortions === 1 ? 'pickup' : 'pickups'}.</span></>}
      {state.status === 'signed-out' && <><strong>Every portion matters.</strong><span>Sign in to see the latest verified campus totals.</span></>}
      {state.status === 'error' && <><strong>Our impact is growing.</strong><span>Live totals are temporarily unavailable.</span></>}
    </div>
    <Link className="home-impact-link" href="/impact">Explore our impact <span aria-hidden="true">→</span></Link>
  </section>;
}
