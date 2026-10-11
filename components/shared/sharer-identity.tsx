import type { SharingIdentity } from '@/lib/contracts';

export function SharerIdentity({ identity, label = 'Shared by' }: { identity?: SharingIdentity; label?: string }) {
  return <p className="sharer-identity">{identity ? <>{label} <strong>{identity.display_name}</strong>{identity.organization_name && <span> · {identity.organization_name}</span>}</> : <span className="muted">Sharing identity unavailable</span>}</p>;
}
