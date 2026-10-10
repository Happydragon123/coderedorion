import assert from 'node:assert/strict';
import { test } from 'node:test';
import { providerFailureMessage } from './provider-errors';
test('provider errors identify configuration failures without reflecting secrets or raw text', () => {
  const raw = 'API key not valid: pretend-secret-key; private provider detail';
  assert.match(providerFailureMessage(400, { error: { message: raw } }), /rejected the server API key/);
  assert.match(providerFailureMessage(400, { error: { details: [{ reason: 'API_KEY_INVALID' }] } }), /rejected the server API key/);
  for (const status of [400, 401, 403, 404, 500]) {
    const message = providerFailureMessage(status, { error: { message: raw } });
    assert.ok(!message.includes('pretend-secret-key') && !message.includes('private provider detail'));
  }
  assert.match(providerFailureMessage(403, null), /denied access/);
  assert.match(providerFailureMessage(404, {}), /GEMINI_MODEL/);
  assert.match(providerFailureMessage(400, 'unexpected response'), /structured-output/);
  assert.match(providerFailureMessage(500, {}), /unavailable/);
});
