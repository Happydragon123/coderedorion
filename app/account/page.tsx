import Link from 'next/link';
import { requirePageUser } from '@/lib/server/auth';
import { signOut } from './actions';
export const dynamic = 'force-dynamic';
export default async function Account() {
  const { user } = await requirePageUser();
  return <section className="panel account-panel"><p className="eyebrow">Your campus connection</p><h1>Your account</h1><p className="account-email">Signed in as {user.email}.</p><p className="muted">Browse available food, manage your private pickups, or share surplus food.</p><div className="account-links"><Link className="button" href="/listings">Find food</Link><Link className="button button-secondary" href="/my-pickups">My pickups</Link><Link className="button button-secondary" href="/share">Share food</Link><Link className="button button-secondary" href="/manage">Manage listings</Link></div><form action={signOut}><button className="button-secondary">Sign out</button></form></section>;
}
