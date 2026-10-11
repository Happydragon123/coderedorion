import assert from 'node:assert/strict';
import test from 'node:test';
import { distanceMeters, directionsUrl, formatDistance } from '../../lib/geo';
test('straight-line distances handle identity, equator, poles and antimeridian', () => {
  assert.equal(distanceMeters({latitude:0,longitude:0},{latitude:0,longitude:0}), 0);
  assert.ok(Math.abs(distanceMeters({latitude:0,longitude:0},{latitude:0,longitude:1}) - 111195) < 1);
  assert.ok(distanceMeters({latitude:90,longitude:0},{latitude:90,longitude:100}) < 0.001);
  assert.ok(Math.abs(distanceMeters({latitude:0,longitude:179},{latitude:0,longitude:-179}) - 222390) < 1);
});
test('directions preserve latitude/longitude order and reject invalid coordinates', () => {
  assert.equal(directionsUrl({latitude:29,longitude:-95}), 'https://www.google.com/maps/dir/?api=1&destination=29,-95');
  const location = { id: 'landmark', name: 'Landmark', latitude: 29, longitude: -95 };
  assert.equal(directionsUrl(location), directionsUrl({ latitude: 29, longitude: -95 }));
  assert.equal(distanceMeters(location, location), 0);
  assert.throws(() => directionsUrl({latitude:95,longitude:29}));
  assert.throws(() => distanceMeters({latitude:NaN,longitude:0},{latitude:0,longitude:0}));
  assert.equal(formatDistance(1609.344), '1.0 mi straight-line');
});

test('directions prefer validated configured Google Maps URLs and safely fall back to coordinates', () => {
  const point = { latitude: 29, longitude: -95 };
  for (const google_maps_url of ['https://maps.app.goo.gl/Example123', 'https://www.google.com/maps/place/Student+Center']) {
    assert.equal(directionsUrl({ ...point, google_maps_url }), google_maps_url);
  }
  for (const google_maps_url of [null, '', 'javascript:alert(1)', 'https://google.com.evil.example/maps/place/test', 'https://example.com/maps']) {
    assert.equal(directionsUrl({ ...point, google_maps_url }), directionsUrl(point));
  }
});
