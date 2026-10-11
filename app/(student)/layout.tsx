import { requirePageUser } from '@/lib/server/auth';
import styles from '@/components/student/student.module.css';
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser();
  return <div className={styles.student}>{children}</div>;
}
