import { test } from 'node:test';
import assert from 'node:assert/strict';
import { googleMapsUrlSchema, locationSchema } from '../lib/contracts';
const location = { id: '00000000-0000-4000-8000-000000000001', name: 'Validation fixture', latitude: 0, longitude: 0 };
test('verified landmark DTO remains compatible with absent/null maps link', () => {
  assert.equal(locationSchema.safeParse(location).success, true);
  assert.equal(locationSchema.safeParse({ ...location, google_maps_url: null }).success, true);
});
test('Google Maps links accept only supported HTTPS hosts and maps paths', () => {
  for (const value of ['https://maps.app.goo.gl/ExampleToken', 'https://goo.gl/maps/ExampleToken', 'https://www.google.com/maps/place/Example', 'https://google.com/maps?q=example', 'https://maps.google.com/?q=example']) assert.equal(googleMapsUrlSchema.safeParse(value).success, true, value);
  for (const value of ['https://maps.app.goo.gl/', 'https://maps.app.goo.gl', 'http://maps.google.com/', 'https://maps.google.com.evil.example/', 'https://evil.example/?next=https://google.com/maps', 'https://user@maps.google.com/', 'https://user:pass@maps.google.com/', 'https://maps.google.com:8443/', 'https://google.com/search?q=maps', 'https://goo.gl/notmaps', 'https://google.com/maps-other', 'https://maps.google.com\\@evil.example/', 'https://maps.google.com/\n', ' https://maps.google.com/', 'https://maps.google.com/%0a', 'https://maps.google.com./', 'https://google.com/maps/../search', 'https://maps.app.goo.gl/%2e', 'https://google.com/maps/./place', 'javascript:alert(1)']) assert.equal(googleMapsUrlSchema.safeParse(value).success, false, value);
});
