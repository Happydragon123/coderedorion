import Link from 'next/link';
import { requirePageUser } from '@/lib/server/auth';
import { signOut } from './actions';
export const dynamic = 'force-dynamic';
export default async function Account() {
  const { user } = await requirePageUser();
  return <section className="panel"><h1>Your account</h1><p>Signed in as {user.email}.</p><p className="muted">Browse available food, manage your private pickups, or share surplus food.</p><p><Link href="/listings">Find food</Link> · <Link href="/my-pickups">My pickups</Link> · <Link href="/share">Share food</Link> · <Link href="/manage">Manage</Link></p><form action={signOut}><button>Sign out</button></form></section>;
}
