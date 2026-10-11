'use client';
import { api } from '@/lib/api-client';
import { estimateCollectedImpact, IMPACT_ASSUMPTIONS } from '@/lib/impact-estimates';
import { Failure, useResource } from './common';
import styles from './student.module.css';

const estimatedNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });

export function ImpactView() {
  const state = useResource(api.impact);
  const estimates = state.data ? estimateCollectedImpact(state.data.collected_portions) : null;

  return <>
    <button className={styles.secondary} onClick={state.refresh}>Refresh totals</button>
    {state.loading && <p className="loading-state" role="status">Loading impact…</p>}
    {state.error && <Failure sessionExpired={state.sessionExpired} message={state.error} retry={state.refresh}/>}
    {state.data && estimates && <>
      <div className={styles.impactGrid}>
        <section className={`${styles.card} ${styles.impactPrimary}`}>
          <p className="eyebrow">Shared and collected</p>
          <h2>Collected portions</h2>
          <div className={styles.stat}>{state.data.collected_portions.toLocaleString()}</div>
          <p>Organizer-confirmed handovers. This is the verified total behind the estimates.</p>
        </section>
        <section className={`${styles.card} ${styles.impactSecondary}`}>
          <p className="eyebrow">Estimated impact</p>
          <h2>Food redistributed</h2>
          <div className={styles.stat}>≈{estimatedNumber(estimates.poundsRedistributed)} lb</div>
          <p>Based on a conservative average of half a pound per collected portion.</p>
        </section>
        <section className={`${styles.card} ${styles.impactSecondary}`}>
          <p className="eyebrow">By weight</p>
          <h2>Meal equivalents</h2>
          <div className={styles.stat}>≈{estimatedNumber(estimates.mealEquivalents)}</div>
          <p>A standardized comparison, not a count of complete meals consumed.</p>
        </section>
        {([['Posted portions', state.data.posted_portions, 'Food offered to the campus community.'], ['Active reserved portions', state.data.active_reserved_portions, 'Reserved portions awaiting collection.']] as const).map(([label, count, description]) => <section className={`${styles.card} ${styles.impactSecondary}`} key={label}><h2>{label}</h2><div className={styles.stat}>{count.toLocaleString()}</div><p>{description}</p></section>)}
      </div>
      <details className={styles.impactMethod}>
        <summary>How these estimates are calculated</summary>
        <p>Each collected portion is estimated at {IMPACT_ASSUMPTIONS.poundsPerPortion} pounds. Meal equivalents use {IMPACT_ASSUMPTIONS.poundsPerMealEquivalent} pounds per meal, following Feeding America&apos;s reporting convention. Portion sizes vary, so these figures are estimates rather than measured totals.</p>
        <a href="https://www.feedingamerica.org/ways-to-give/faq/about-our-claims" target="_blank" rel="noreferrer">Read Feeding America&apos;s methodology</a>
      </details>
    </>}
  </>;
}
