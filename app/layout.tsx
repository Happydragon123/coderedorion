import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { Navigation } from '@/components/shared/navigation';
export const metadata: Metadata = { title: 'Campus Food Rescue', description: 'Share surplus food and coordinate campus pickups.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><header className="site-header"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true">↗</span>Campus Food Rescue</Link><Navigation/></header><main id="main" className="container">{children}</main><footer className="container site-footer"><span>Campus food, shared with care.</span><span>Pickup times in America/Chicago</span></footer></body></html>;
}
