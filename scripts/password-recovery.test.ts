import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { isRecoveryCallback, newPasswordSchema, recoveryCallback, recoveryEmailSchema } from '../lib/password-recovery';
import { ForgotPasswordForm } from '../components/shared/forgot-password-form';

test('recovery request validates email and rejects extra identity fields', () => {
  assert.deepEqual(recoveryEmailSchema.parse({ email: ' member@example.com ' }), { email: 'member@example.com' });
  for (const input of [{ email: 'bad' }, { email: '' }, { email: 'a'.repeat(255) }, { email: 'member@example.com', user_id: 'someone' }]) {
    assert.equal(recoveryEmailSchema.safeParse(input).success, false);
  }
});

test('new passwords must match, meet length bounds, and preserve whitespace', () => {
  const password = '  a long password  ';
  assert.equal(newPasswordSchema.parse({ password, confirm_password: password }).password, password);
  for (const input of [
    { password: 'short', confirm_password: 'short' },
    { password, confirm_password: 'different' },
    { password: 'x'.repeat(257), confirm_password: 'x'.repeat(257) },
    { password, confirm_password: password, user_id: 'someone' },
  ]) assert.equal(newPasswordSchema.safeParse(input).success, false);
});

test('recovery callback stays on the requesting origin and distinguishes signup from recovery', () => {
  const callback = new URL(recoveryCallback('https://campus.example'));
  assert.equal(callback.origin, 'https://campus.example');
  assert.equal(callback.pathname, '/auth/callback');
  assert.equal(callback.searchParams.get('type'), 'recovery');
  assert.equal(callback.searchParams.has('next'), false);
  assert.equal(isRecoveryCallback('recovery'), true);
  assert.equal(isRecoveryCallback(null, 'recovery'), true);
  assert.equal(isRecoveryCallback('signup'), false);
  assert.equal(isRecoveryCallback('email', null), false);
});

test('forgot-password form is labeled and never asserts an account exists before requesting', () => {
  const html = renderToStaticMarkup(createElement(ForgotPasswordForm));
  assert.ok(html.includes('for="recovery-email"'));
  assert.match(html, /autocomplete="email"/i);
  assert.ok(html.includes('role="status"'));
  assert.ok(html.includes('Send reset link'));
  assert.ok(!html.includes('Reset email sent'));
});
