import Link from 'next/link';
import { requirePageUser } from '@/lib/server/auth';
import styles from '@/components/student/student.module.css';
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser();
  return <div className={styles.student}><nav className={styles.nav} aria-label="Student navigation"><Link href="/listings">Find food</Link><Link href="/my-pickups">My pickups</Link><Link href="/impact">Impact</Link></nav>{children}</div>;
}
