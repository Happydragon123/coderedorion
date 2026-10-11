import type { Listing } from '../../lib/contracts';

export function isActiveListing(row: Listing, now: number) {
  return row.status === 'open' && Date.parse(row.pickup_deadline) > now;
}

export function ManageQuantity({ row, now }: { row: Listing; now: number }) {
  return isActiveListing(row, now)
    ? <><strong>{row.available_portions}</strong> available <span className="muted">of {row.portions_total} portions posted</span></>
    : <><strong>{row.portions_total}</strong> portions posted<p>New reservations are no longer accepted.</p></>;
}
