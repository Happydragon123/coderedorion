import { requirePageUser } from '@/lib/server/auth';
export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser();
  return <>{children}</>;
}
