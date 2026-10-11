'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import Link from 'next/link';
import { divIcon, type PathOptions } from 'leaflet';
import type { Feature, FeatureCollection } from 'geojson';
import { GeoJSON, MapContainer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import campusBasemap from './campus-basemap.json';
import { pickupMarkers, type CampusLandmark, type PickupSpot } from './pickup-data';
import styles from './campus-pickup-map.module.css';

// The generated JSON's literal geometry/bbox types are widened by TypeScript.
// Geometry, bounds and allowed properties are checked in campus-pickup-map.test.ts.
const basemap = campusBasemap as unknown as FeatureCollection;
const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const footpaths = new Set(['footway', 'path', 'pedestrian', 'steps', 'cycleway']);

function CampusBounds({ landmarks }: { landmarks: CampusLandmark[] }) {
  const map = useMap();
  const coordinates = JSON.stringify(landmarks.map(location => [location.latitude, location.longitude]));
  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      map.fitBounds(JSON.parse(coordinates), { padding: [38, 38], maxZoom: 17 });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, coordinates]);
  return null;
}

function campusStyle(feature: Feature | undefined): PathOptions {
  if (feature?.properties?.kind === 'green') return { weight: 0, fillColor: '#dfe8d6', fillOpacity: 1 };
  if (feature?.properties?.kind === 'building') return { color: '#c4cec0', weight: 1, fillColor: '#e6e9e0', fillOpacity: 1 };
  const walking = footpaths.has(feature?.properties?.highway);
  return { color: walking ? '#d1d5cb' : '#fffef9', weight: walking ? 2 : 7, opacity: 1 };
}

function locationIcon(portions?: number) {
  const center = portions === undefined
    ? '<circle cx="16" cy="15" r="5" fill="white"/>'
    : `<text x="16" y="20" text-anchor="middle" fill="white" font-size="${portions > 99 ? 10 : 14}" font-family="sans-serif" font-weight="700">${portions > 99 ? '99+' : portions}</text>`;
  return divIcon({
    className: styles.locationMarker,
    html: `<svg viewBox="0 0 32 40" aria-hidden="true"><path d="M16 1C8 1 2 7 2 15c0 10 14 24 14 24s14-14 14-24C30 7 24 1 16 1Z" fill="#d52232" stroke="white" stroke-width="2"/>${center}</svg>`,
    iconSize: [44, 48],
    iconAnchor: [22, 47],
    popupAnchor: [0, -39],
    tooltipAnchor: [0, -35],
  });
}

export default function InteractiveCampusMap({ landmarks, spots, availabilityKnown }: {
  landmarks: CampusLandmark[]; spots: PickupSpot[]; availabilityKnown: boolean;
}) {
  const markers = pickupMarkers(landmarks, spots);
  return <MapContainer center={[landmarks[0].latitude, landmarks[0].longitude]} zoom={16} minZoom={15} maxZoom={19} maxBounds={[[29.716, -95.349], [29.726, -95.336]]} maxBoundsViscosity={0.9} scrollWheelZoom={false} preferCanvas className={styles.map}>
    <CampusBounds landmarks={landmarks}/>
    <GeoJSON data={basemap} style={campusStyle} interactive={false} attribution={attribution}/>
    {markers.map(({ landmark, pickup }) => <Marker key={landmark.name} position={[landmark.latitude, landmark.longitude]} icon={locationIcon(pickup?.portions)} title={landmark.name} alt={`Pickup location: ${landmark.name}`} keyboard zIndexOffset={pickup ? 200 : 0}>
      <Tooltip>{landmark.name}{pickup ? ` · ${pickup.portions} portions available` : ''}</Tooltip>
      <Popup><strong>{landmark.name}</strong>
        {pickup ? <ul className={styles.popupList}>{pickup.listings.map(listing => <li key={listing.id}><Link href={`/listings/${listing.id}`}>{listing.title}</Link><br/>{listing.available_portions} portions available</li>)}</ul> : <p>{availabilityKnown ? 'No food posted here right now.' : <>Campus pickup location. <Link href="/sign-in">Sign in</Link> to check available food.</>}</p>}
        <a href={landmark.google_maps_url ?? `https://www.google.com/maps/dir/?api=1&destination=${landmark.latitude},${landmark.longitude}`} target="_blank" rel="noreferrer">Directions ↗</a>
      </Popup>
    </Marker>)}
  </MapContainer>;
}
