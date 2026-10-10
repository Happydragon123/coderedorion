 'use client';
import 'leaflet/dist/leaflet.css';
import { useState } from 'react';
import Link from 'next/link';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import type { Listing } from '@/lib/contracts';
import styles from '@/components/student/student.module.css';
export default function FoodMap({ listings, tileUrl, attribution }: { listings: Listing[]; tileUrl: string; attribution: string }) {
  const [failed, setFailed] = useState(false);
  const groups = new Map<string, Listing[]>();
  for (const listing of listings) groups.set(listing.location_id, [...(groups.get(listing.location_id) ?? []), listing]);
  const locations = [...groups.values()];
  if (!locations.length) return null;
  const points: [number, number][] = locations.map(group => [group[0].location.latitude, group[0].location.longitude]);
  return <>{failed && <p role="status" className="notice">Map tiles could not load. The food list and directions below remain available.</p>}<div className={styles.map}><MapContainer key={JSON.stringify(points)} center={points[0]} zoom={15} bounds={points.length > 1 ? points : undefined} boundsOptions={{ padding: [24, 24], maxZoom: 16 }} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}><TileLayer url={tileUrl} attribution={attribution} eventHandlers={{ tileerror: () => setFailed(true) }}/>{locations.map(group => <CircleMarker key={group[0].location_id} center={[group[0].location.latitude, group[0].location.longitude]} radius={10}><Popup><strong>{group[0].location.name}</strong><ul>{group.map(listing => <li key={listing.id}><Link href={`/listings/${listing.id}`}>{listing.title}</Link> · {listing.available_portions} portions</li>)}</ul></Popup></CircleMarker>)}</MapContainer></div></>;
}
