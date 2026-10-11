import { ListingForm } from '@/components/organizer/listing-form';
import Link from 'next/link';
import { requirePageUser } from '@/lib/server/auth';
import { profile } from '@/lib/data/profile';
import { SharerIdentity } from '@/components/shared/sharer-identity';
import type { Profile } from '@/lib/contracts';

export default async function SharePage() {
  const { user, supabase } = await requirePageUser();
  let identity: Profile | undefined;
  try { identity = await profile(supabase, user.id); } catch { /* Keep manual posting available and surface missing identity. */ }
  return <><div className="page-heading"><span className="section-kicker">Make someone’s day</span><h1>Good food deserves a second plate.</h1><p className="page-description">Share your extra food with campus. Add the details, choose a pickup time, and we’ll help it find a home.</p></div>
    <section className="sharing-preview" aria-labelledby="posting-identity-title"><h2 id="posting-identity-title">Your sharing identity</h2><SharerIdentity identity={identity} label="Posting as"/>{!identity && <p role="alert">We couldn’t load your sharing profile. Open Account to try again before posting.</p>}<p className="muted">People viewing your listings see your saved display name and organization. Your email stays private.</p><Link href="/account">Edit sharing identity</Link></section>
    <ListingForm /></>;
}
