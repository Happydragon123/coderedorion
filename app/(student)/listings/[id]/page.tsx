import { notFound } from 'next/navigation';
import { idSchema } from '@/lib/contracts';
import { ListingDetail } from '@/components/student/listing-detail';
export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; if (!idSchema.safeParse(id).success) notFound(); return <ListingDetail id={id}/>; }
