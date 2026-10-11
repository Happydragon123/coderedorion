'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const links = [['/','Home'],['/listings','Find food'],['/my-pickups','My pickups'],['/share','Share food'],['/manage','Manage'],['/impact','Impact'],['/account','Account'],['/sign-in','Sign in']] as const;
export function Navigation() {
  const pathname = usePathname();
  return <nav className="site-nav" aria-label="Main navigation">{links.map(([href,label]) => <Link key={href} href={href} aria-current={pathname === href || (href !== '/' && pathname.startsWith(`${href}/`)) ? 'page' : undefined}>{label}</Link>)}</nav>;
}
