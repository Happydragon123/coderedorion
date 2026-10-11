import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { authDestination, signupCallback, signupSchema } from '../lib/auth-input';
import { listingSchema, profileResponseSchema, sharingIdentitySchema, updateProfileSchema } from '../lib/contracts';
import { demoListing } from '../lib/fixtures';
import { SharerIdentity } from '../components/shared/sharer-identity';

test('registration validates identity and matching passwords without changing password whitespace', () => {
  const input = { display_name: '  Campus sharer  ', organization_name: '   ', email: ' sharer@example.com ', password: '  long password  ', confirm_password: '  long password  ' };
  const parsed = signupSchema.parse(input);
  assert.equal(parsed.display_name, 'Campus sharer');
  assert.equal(parsed.organization_name, null);
  assert.equal(parsed.email, 'sharer@example.com');
  assert.equal(parsed.password, input.password);
  for (const changes of [{ confirm_password: 'different' }, { password: 'short', confirm_password: 'short' }, { display_name: '   ' }, { organization_name: 'x'.repeat(121) }, { email: 'bad' }, { role: 'admin' }]) {
    assert.equal(signupSchema.safeParse({ ...input, ...changes }).success, false);
  }
});

test('profile updates cannot inject ownership, private fields or authorization metadata', () => {
  const identity = { display_name: 'Member', organization_name: '  Food club  ' };
  assert.deepEqual(updateProfileSchema.parse(identity), { display_name: 'Member', organization_name: 'Food club' });
  for (const changes of [{ id: demoListing.organizer_id }, { email: 'private@example.com' }, { role: 'admin' }, { display_name: '' }, { display_name: 'x'.repeat(121) }, { organization_name: {} }]) {
    assert.equal(updateProfileSchema.safeParse({ ...identity, ...changes }).success, false);
  }
  assert.equal(updateProfileSchema.safeParse({ display_name: 'Member' }).success, false);
  assert.equal(profileResponseSchema.safeParse({ profile: { id: demoListing.organizer_id, ...identity, email: 'private@example.com' } }).success, false);
});

test('listing attribution shares only name and optional organization and supports older DTOs', () => {
  const sharer = { display_name: 'Real saved name', organization_name: null };
  assert.equal(listingSchema.safeParse(demoListing).success, true);
  assert.deepEqual(listingSchema.parse({ ...demoListing, sharer }).sharer, sharer);
  for (const extra of [{ email: 'private@example.com' }, { id: demoListing.organizer_id }, { pickup_code: 'PRIVATE' }]) {
    assert.equal(sharingIdentitySchema.safeParse({ ...sharer, ...extra }).success, false);
    assert.equal(listingSchema.safeParse({ ...demoListing, sharer: { ...sharer, ...extra } }).success, false);
  }
});

test('auth returns stay on known local pages, including callback and sign-in destinations', () => {
  for (const value of ['/account', '/share', '/listings/' + demoListing.id, '/manage?tab=active']) assert.equal(authDestination(value), value);
  for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/sign-in', '/auth/callback', '/api/me/profile', '/listings/../sign-in', '/listings/%2f%2fevil.test', '/account\n', null, ['/share']]) assert.equal(authDestination(value), '/account');
  const callback = new URL(signupCallback('http://localhost:3000', '//evil.test'));
  assert.equal(callback.origin, 'http://localhost:3000');
  assert.equal(callback.pathname, '/auth/callback');
  assert.equal(callback.searchParams.get('next'), '/account');
});

test('sharing attribution escapes saved names and does not invent missing identities', () => {
  const html = renderToStaticMarkup(createElement(SharerIdentity, { identity: { display_name: '<script>alert(1)</script>', organization_name: 'Food & Friends' } }));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('Food &amp; Friends'));
  assert.ok(!html.includes('<script>'));
  const absent = renderToStaticMarkup(createElement(SharerIdentity));
  assert.ok(absent.includes('Sharing identity unavailable'));
  assert.ok(!absent.includes('Campus member'));
});
