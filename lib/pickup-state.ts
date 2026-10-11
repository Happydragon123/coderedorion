import type { Listing, PickupContext, Reservation } from './contracts';

export function pickupState(listing: Listing, context: PickupContext | undefined, now: number): { kind: 'unknown' | 'owner' | 'none' | Reservation['status']; canReserve: boolean } {
  if (!context) return { kind: 'unknown', canReserve: false } as const;
  if (context.is_owner) return { kind: 'owner', canReserve: false } as const;
  const reservation = context.reservation;
  const kind = reservation?.status === 'reserved' && Date.parse(listing.pickup_deadline) <= now
    ? 'expired' : reservation?.status ?? 'none';
  const canReserve = kind !== 'reserved' && kind !== 'collected' && listing.status === 'open'
    && Date.parse(listing.pickup_deadline) > now && listing.available_portions > 0;
  return { kind, canReserve };
}
