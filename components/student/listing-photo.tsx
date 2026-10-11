'use client';
import { useEffect, useReducer } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { initialPhotoState, photoReducer } from './photo-state';
import styles from './student.module.css';

type PhotoProps = { path: string | null; title: string; variant?: 'card' | 'detail' };
export function ListingPhoto({ path, title, variant = 'detail' }: PhotoProps) {
  const className = variant === 'card' ? styles.cardPhoto : styles.detailPhoto;
  return <div className={className}>{path
    ? <SignedPhoto key={path} path={path} title={title} variant={variant}/>
    : <p className={styles.photoFallback}>No photo provided</p>}</div>;
}

function SignedPhoto({ path, title, variant }: PhotoProps & { path: string }) {
  const [state, dispatch] = useReducer(photoReducer, initialPhotoState);
  const attempt = state.attempt;
  useEffect(() => {
    let current = true;
    async function load() {
      try {
        const { data, error } = await createClient().storage.from('food-photos').createSignedUrl(path, 300);
        if (error || !data?.signedUrl) throw new Error('Photo unavailable');
        if (current) dispatch({ type: 'signed', attempt, url: data.signedUrl });
      } catch {
        if (current) dispatch({ type: 'failed', attempt });
      }
    }
    void load();
    return () => { current = false; };
  }, [path, attempt]);
  if (state.status === 'loading') return <p className={styles.photoFallback} role="status">Loading photo…</p>;
  if (state.status === 'failed') return <div className={styles.photoFallback} role="status"><p>Photo unavailable.</p><button type="button" className={styles.secondary} onClick={() => dispatch({ type: 'retry' })} aria-label={`Retry photo for ${title}`}>Retry photo</button></div>;
  return <>
    {/* Private signed URLs bypass the shared image optimizer. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img key={attempt} className={styles.photo} src={state.url} alt={title} loading={variant === 'card' ? 'lazy' : 'eager'} onError={() => dispatch({ type: 'failed', attempt })}/>
  </>;
}
