'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { supabaseConfig } from '@/lib/supabase/config';
const links = [['/','Home'],['/listings','Find food'],['/my-pickups','My pickups'],['/share','Share food'],['/manage','Manage'],['/impact','Impact']] as const;
export function Navigation() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (!supabaseConfig()) return;
    let active = true;
    const client = createClient();
    client.auth.getUser().then(({ data }) => { if (active) setSignedIn(!!data.user); }).catch(() => { if (active) setSignedIn(false); });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => { if (active) setSignedIn(!!session?.user); });
    return () => { active = false; subscription.unsubscribe(); };
  }, [pathname]);
  const visible = [...links, ...(signedIn ? [['/account','Account']] : [['/sign-in','Sign in'],['/sign-up','Create account']])];
  return <nav className="site-nav" aria-label="Main navigation">{visible.map(([href,label]) => <Link key={href} href={href} aria-current={pathname === href || (href !== '/' && pathname.startsWith(`${href}/`)) ? 'page' : undefined}>{label}</Link>)}</nav>;
}
