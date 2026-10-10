import Link from 'next/link';
import { requirePageUser } from '@/lib/server/auth';
import { signOut } from './actions';
export const dynamic = 'force-dynamic';
export default async function Account() {
  const { user } = await requirePageUser();
  return <section className="panel"><h1>Your account</h1><p>Signed in as {user.email}.</p><p className="muted">Browse available food or manage your private pickups. Organizer tools are the next handoff.</p><p><Link href="/listings">Find food</Link> · <Link href="/my-pickups">My pickups</Link></p><form action={signOut}><button>Sign out</button></form></section>;
}
