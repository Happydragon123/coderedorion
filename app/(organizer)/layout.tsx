import Link from 'next/link';
import { requirePageUser } from '@/lib/server/auth';
export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser();
  return <><nav aria-label="Organizer navigation"><Link href="/share">Share food</Link><Link href="/manage">Manage listings</Link></nav>{children}</>;
}
