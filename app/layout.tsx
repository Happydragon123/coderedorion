import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata = { title: 'Campus Food Rescue', description: 'Share surplus food and coordinate campus pickups.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><header className="site-header"><Link className="brand" href="/">Campus Food Rescue</Link><nav aria-label="Main navigation"><Link href="/">Home</Link><Link href="/listings">Find food</Link><Link href="/my-pickups">My pickups</Link><Link href="/impact">Impact</Link><Link href="/account">Account</Link><Link href="/sign-in">Sign in</Link></nav></header><main id="main" className="container">{children}</main><footer className="container">Campus food, shared with care. Pickup times shown in America/Chicago.</footer></body></html>;
}
