import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialPhotoState, photoReducer } from '../components/student/photo-state';

test('failed image removes its URL and explicit retry obtains a fresh signed URL', () => {
  const ready = photoReducer(initialPhotoState, { type: 'signed', attempt: 0, url: 'https://storage.example/photo?token=expired' });
  const failed = photoReducer(ready, { type: 'failed', attempt: 0 });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.url, undefined);
  const retry = photoReducer(failed, { type: 'retry' });
  assert.equal(retry.status, 'loading');
  assert.equal(retry.url, undefined);
  const renewed = photoReducer(retry, { type: 'signed', attempt: retry.attempt, url: 'https://storage.example/photo?token=fresh' });
  assert.equal(renewed.status, 'ready');
  assert.equal(renewed.url, 'https://storage.example/photo?token=fresh');
  assert.equal(photoReducer(renewed, { type: 'failed', attempt: 0 }), renewed);
  assert.equal(photoReducer(renewed, { type: 'signed', attempt: 0, url: 'stale' }), renewed);
});

test('signing failure or missing URL stays recoverable without a broken image', () => {
  for (const event of [{ type: 'failed', attempt: 0 }, { type: 'signed', attempt: 0, url: '' }] as const) {
    const failed = photoReducer(initialPhotoState, event);
    assert.equal(failed.status, 'failed');
    assert.equal(failed.url, undefined);
    const retry = photoReducer(failed, { type: 'retry' });
    assert.equal(retry.attempt, 1);
    assert.equal(photoReducer(retry, { type: 'failed', attempt: 1 }).status, 'failed');
  }
});
