import { ManageListings } from '@/components/organizer/manage';
import { idSchema } from '@/lib/contracts';
import { notFound } from 'next/navigation';
export default async function ManageListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  return <><h1>Manage pickup</h1><ManageListings listingId={id} /></>;
}
