import { ManageListings } from '@/components/organizer/manage';
import styles from '@/components/organizer/organizer.module.css';
export default function ManagePage() { return <div className={styles.managePage}><div className={`page-heading ${styles.manageHeading}`}><span className="section-kicker">Your contributions</span><h1>Manage your listings</h1><p className="page-description">Keep track of the food you’ve shared and help each pickup go smoothly.</p></div><ManageListings /></div>; }
