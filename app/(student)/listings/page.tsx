import { FoodFeed } from '@/components/student/food-feed';
import { requirePageUser } from '@/lib/server/auth';
export default async function ListingsPage() { const { user } = await requirePageUser(); return <><div className="page-heading"><p className="eyebrow">Your next campus pickup</p><h1>Find food on campus</h1><p className="page-description">Choose a landmark or share your location to find a pickup nearby.</p></div><FoodFeed viewerId={user.id}/></>; }
