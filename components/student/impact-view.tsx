 'use client';
import { api } from '@/lib/api-client';
import { Failure, useResource } from './common';
import styles from './student.module.css';
export function ImpactView() { const state = useResource(api.impact); return <><button onClick={state.refresh}>Refresh totals</button>{state.loading && <p role="status">Loading impact…</p>}{state.error && <Failure message={state.error} retry={state.refresh}/>} {state.data && <div className={styles.cards}>{([['Posted portions', state.data.posted_portions], ['Active reserved portions', state.data.active_reserved_portions], ['Collected portions', state.data.collected_portions]] as const).map(([label, count]) => <section className={styles.card} key={label}><h2>{label}</h2><div className={styles.stat}>{count}</div></section>)}</div>}</>; }
