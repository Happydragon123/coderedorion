import type { ReactNode } from 'react';
export function StatusPanel({ title, children, kind = 'empty' }: { title: string; children: ReactNode; kind?: 'empty' | 'error' | 'loading' }) {
  return <section className="panel" role={kind === 'error' ? 'alert' : 'status'} aria-live="polite" aria-busy={kind === 'loading'}><h2>{title}</h2>{children}</section>;
}
