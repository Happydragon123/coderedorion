import assert from 'node:assert/strict';
import test from 'node:test';
import { demoListing } from '../lib/fixtures';
import { campusLandmarks, groupAvailablePickups, mapLandmarks, pickupMarkers } from '../components/home/pickup-data';
import campusBasemap from '../components/home/campus-basemap.json';

const now = Date.parse('2030-01-01T19:00:00Z');

test('pickup dots group posts at the same location and exclude unavailable inventory', () => {
  const otherLocation = { ...demoListing.location, id: '00000000-0000-4000-8000-000000000006', name: 'Another test landmark' };
  const spots = groupAvailablePickups([
    demoListing,
    { ...demoListing, id: '00000000-0000-4000-8000-000000000007', available_portions: 1 },
    { ...demoListing, id: '00000000-0000-4000-8000-000000000008', location_id: otherLocation.id, location: otherLocation },
    { ...demoListing, status: 'closed' },
    { ...demoListing, available_portions: 0 },
    { ...demoListing, pickup_deadline: new Date(now).toISOString() },
    { ...demoListing, pickup_deadline: '2029-12-31T20:00:00Z' },
  ], now);
  assert.equal(spots.length, 2);
  const shared = spots.find(spot => spot.location.id === demoListing.location_id)!;
  assert.equal(shared.listings.length, 2);
  assert.equal(shared.portions, 3);
  assert.deepEqual(groupAvailablePickups([demoListing], Date.parse(demoListing.pickup_deadline)), []);
  assert.deepEqual(groupAvailablePickups([], now), []);
});

test('map uses verified campus context and lets live locations supply authoritative coordinates', () => {
  assert.equal(campusLandmarks.length, 9);
  const studentCenter = campusLandmarks.find(landmark => landmark.name === 'Student Center South')!;
  assert.equal(studentCenter.latitude, 29.7200622);
  assert.equal(studentCenter.longitude, -95.3410239);
  const live = { ...studentCenter, latitude: 29.7201 };
  const custom = { ...demoListing.location, name: 'New live landmark' };
  const merged = mapLandmarks([live], [{ location: custom, listings: [demoListing], portions: 2 }]);
  assert.equal(merged.length, 10);
  assert.equal(merged.find(landmark => landmark.name === studentCenter.name)?.latitude, live.latitude);
  assert.ok(merged.some(landmark => landmark.name === custom.name));
  assert.equal(studentCenter.latitude, 29.7200622);
});

test('all nine pickup pins remain visible without a session or available inventory', () => {
  const publicPins = pickupMarkers(campusLandmarks, []);
  assert.equal(publicPins.length, 9);
  assert.ok(publicPins.some(pin => pin.landmark.name === 'Student Center South'));
  assert.ok(publicPins.some(pin => pin.landmark.name === 'Student Center North'));
  assert.ok(publicPins.every(pin => pin.pickup === undefined));
  const location = { ...demoListing.location, ...campusLandmarks[0] };
  const listing = { ...demoListing, location };
  const activePins = pickupMarkers(campusLandmarks, groupAvailablePickups([listing], now));
  assert.equal(activePins.length, 9);
  assert.equal(activePins.find(pin => pin.landmark.name === location.name)?.pickup?.portions, 2);
  const expiredPins = pickupMarkers(campusLandmarks, groupAvailablePickups([listing], Date.parse(listing.pickup_deadline)));
  assert.equal(expiredPins.length, 9);
  assert.ok(expiredPins.every(pin => pin.pickup === undefined));
});

test('campus basemap retains real geography without POI symbols or road shields', () => {
  assert.equal(campusBasemap.type, 'FeatureCollection');
  assert.match(campusBasemap.license, /odbl/);
  const [west, south, east, north] = campusBasemap.bbox;
  assert.ok(campusLandmarks.every(location => location.latitude > south && location.latitude < north && location.longitude > west && location.longitude < east));
  const kinds = new Set(campusBasemap.features.map(feature => feature.properties.kind));
  assert.deepEqual(kinds, new Set(['green', 'road', 'building']));
  assert.ok(campusBasemap.features.every(feature => /^way\/\d+$/.test(feature.id)));
  assert.ok(campusBasemap.features.every(feature => Object.keys(feature.properties).every(key => key === 'kind' || key === 'highway')));
  for (const feature of campusBasemap.features) {
    const geometry = feature.geometry;
    const points = geometry.type === 'Polygon' ? geometry.coordinates[0] as number[][] : geometry.coordinates as number[][];
    assert.ok(points.every(point => point.length === 2 && point.every(Number.isFinite) && point[0] > -96 && point[0] < -95 && point[1] > 29 && point[1] < 30));
    if (geometry.type === 'Polygon') {
      assert.ok(points.length >= 4);
      assert.deepEqual(points[0], points.at(-1));
    } else {
      assert.equal(geometry.type, 'LineString');
      assert.ok(points.length >= 2);
    }
  }
});
