'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { supabaseConfig } from '@/lib/supabase/config';
const links = [['/listings','Find food'],['/share','Share food']] as const;
export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const menu = useRef<HTMLDetailsElement>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (menu.current) menu.current.open = false;
    if (!supabaseConfig()) return;
    let active = true;
    let authChanged = false;
    const client = createClient();
    client.auth.getUser().then(({ data }) => { if (active && !authChanged) setSignedIn(!!data.user); }).catch(() => { if (active && !authChanged) setSignedIn(false); });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => { authChanged = true; if (active) setSignedIn(!!session?.user); });
    return () => { active = false; subscription.unsubscribe(); };
  }, [pathname]);
  async function signOut() {
    setBusy(true); setError('');
    try {
      const { error: failure } = await createClient().auth.signOut({ scope: 'local' });
      if (failure) { setError('Couldn’t sign out. Please try again.'); return; }
      setSignedIn(false);
      if (menu.current) menu.current.open = false;
      router.replace('/sign-in'); router.refresh();
    } catch { setError('Couldn’t sign out. Please try again.'); }
    finally { setBusy(false); }
  }
  function link(href: string, label: string) {
    return <Link key={href} href={href} aria-current={pathname === href || (href !== '/' && pathname.startsWith(`${href}/`)) ? 'page' : undefined}>{label}</Link>;
  }
  return <nav className="site-nav" aria-label="Main navigation">
    {links.map(([href,label]) => link(href,label))}
    {signedIn ? <>{link('/my-pickups','My pickups')}<details ref={menu} className="nav-more"><summary>More</summary><div className="nav-menu">
      {link('/','Home')}{link('/manage','Manage food')}{link('/impact','Impact')}{link('/account','Account')}
      <button type="button" disabled={busy} onClick={() => void signOut()}>{busy ? 'Signing out…' : 'Sign out'}</button>
      {error && <p role="alert">{error}</p>}
    </div></details></> : <>{link('/sign-in','Sign in')}{link('/sign-up','Create account')}</>}
  </nav>;
}
