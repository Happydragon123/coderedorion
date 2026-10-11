import Link from 'next/link';
import type { Listing, PickupContext } from '@/lib/contracts';
import { pickupState } from '@/lib/pickup-state';

export function PickupActions({ listing, context, now, busy, onReserve }: {
  listing: Listing; context?: PickupContext; now: number; busy: boolean; onReserve: () => void;
}) {
  const { kind, canReserve } = pickupState(listing, context, now);
  if (kind === 'owner') return <div className="notice"><p><strong>Your listing.</strong> You cannot reserve food you posted.</p><Link className="button button-secondary" href={`/manage/${listing.id}`}>Manage listing</Link></div>;
  if (kind === 'unknown') return <><p role="status">Checking your pickup status…</p><button disabled>Reserve one portion</button></>;
  const messages = {
    reserved: 'Reserved — you already have one portion. Your pickup remains valid until the deadline, even if the listing is closed.',
    collected: 'Collected — you have already picked up a portion from this listing.',
    cancelled: 'Cancelled — your previous reservation was cancelled. You can reserve again if food is still available.',
    expired: 'Expired — your previous pickup is no longer active.',
  };
  const blockedLabel = Date.parse(listing.pickup_deadline) <= now ? 'Pickup window ended'
    : listing.status === 'closed' ? 'Listing closed' : 'Sold out';
  return <>
    {kind !== 'none' && <div className="notice" role="status"><p>{messages[kind]}</p><Link className="button button-secondary" href="/my-pickups">{kind === 'reserved' ? 'Go to my pickups' : 'View pickup history'}</Link></div>}
    {kind !== 'reserved' && kind !== 'collected' && <><button disabled={busy || !canReserve} onClick={onReserve}>{busy ? 'Reserving…' : !canReserve ? blockedLabel : kind === 'none' ? 'Reserve one portion' : 'Reserve again'}</button><p>Quantity: one portion. Reservations are confirmed by the server.</p></>}
  </>;
}
