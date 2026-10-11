 'use client';
import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { useResource } from './common';
import styles from './student.module.css';
export function ListingPhoto({ path, title }: { path: string | null; title: string }) {
  const loader = useCallback(async () => {
    if (!path) return null;
    const { data, error } = await createClient().storage.from('food-photos').createSignedUrl(path, 300);
    if (error) throw error;
    return data.signedUrl;
  }, [path]);
  const state = useResource(loader);
  if (!path) return null;
  return <>{state.loading && <p className="loading-state" role="status">Loading photo…</p>}{state.error && <p>Photo unavailable. <button onClick={state.refresh}>Retry photo</button></p>}{state.data && <>
    {/* Private signed URLs are short-lived and cannot use the shared image optimizer. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className={styles.photo} src={state.data} alt={title}/>
  </>}</>;
}
