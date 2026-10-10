import { originSchema } from './contracts';
type Point = { latitude: number; longitude: number };
export function distanceMeters(a: Point, b: Point) {
  originSchema.parse({ latitude: a.latitude, longitude: a.longitude }); originSchema.parse({ latitude: b.latitude, longitude: b.longitude });
  const radians = (n: number) => n * Math.PI / 180;
  const dlat = radians(b.latitude - a.latitude), dlng = radians(b.longitude - a.longitude);
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dlng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function formatDistance(meters: number) { return `${(meters / 1609.344).toFixed(1)} mi straight-line`; }
export function directionsUrl(point: Point) {
  originSchema.parse({ latitude: point.latitude, longitude: point.longitude });
  return `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`;
}
