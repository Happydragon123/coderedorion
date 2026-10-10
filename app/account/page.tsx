import { requirePageUser } from '@/lib/server/auth';
import { signOut } from './actions';
export const dynamic = 'force-dynamic';
export default async function Account() {
  const { user } = await requirePageUser();
  return <section className="panel"><h1>Your account</h1><p>Signed in as {user.email}.</p><p className="muted">Pickups and organizer tools will be added by the feature owners.</p><form action={signOut}><button>Sign out</button></form></section>;
}
