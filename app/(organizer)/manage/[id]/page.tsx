import { ManageListings } from '@/components/organizer/manage';
import { idSchema } from '@/lib/contracts';
import { notFound } from 'next/navigation';
import Link from 'next/link';
export default async function ManageListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  return <><p><Link href="/manage">← Your listings</Link></p><div className="page-heading"><span className="section-kicker">From shared to collected</span><h1>Manage pickup</h1></div><ManageListings listingId={id} /></>;
}
