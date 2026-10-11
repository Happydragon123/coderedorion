import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { demoListing } from '../lib/fixtures';
import { isActiveListing, ManageQuantity } from '../components/organizer/manage-state';

const deadline = Date.parse(demoListing.pickup_deadline);
test('Manage keeps sold-out open listings active and separates closed/expired history at the deadline', () => {
  assert.equal(isActiveListing(demoListing, deadline - 1), true);
  assert.equal(isActiveListing({ ...demoListing, available_portions: 0 }, deadline - 1), true);
  assert.equal(isActiveListing({ ...demoListing, status: 'closed' }, deadline - 1), false);
  assert.equal(isActiveListing(demoListing, deadline), false);
  assert.equal(isActiveListing(demoListing, deadline + 1), false);
});

test('Manage history reports original posted quantities without implying availability or collection', () => {
  for (const [row, now] of [[{ ...demoListing, status: 'closed' as const }, deadline - 1], [demoListing, deadline]] as const) {
    const html = renderToStaticMarkup(createElement(ManageQuantity, { row, now }));
    assert.ok(html.includes(`<strong>${row.portions_total}</strong> portions posted`));
    assert.ok(!html.includes('available'));
    assert.ok(!html.includes('collected'));
    assert.ok(html.includes('New reservations are no longer accepted.'));
  }
  const html = renderToStaticMarkup(createElement(ManageQuantity, { row: demoListing, now: deadline - 1 }));
  assert.ok(html.includes(`<strong>${demoListing.available_portions}</strong> available`));
});
