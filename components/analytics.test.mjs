import test from 'node:test';
import assert from 'node:assert/strict';
import { isAnalyticsSuppressedPath } from './analytics.ts';

test('suppresses analytics on the account deletion route and descendants', () => {
  assert.equal(isAnalyticsSuppressedPath('/delete-account'), true);
  assert.equal(isAnalyticsSuppressedPath('/delete-account/'), true);
  assert.equal(isAnalyticsSuppressedPath('/delete-account/confirm'), true);
});

test('does not suppress analytics on unrelated or lookalike routes', () => {
  assert.equal(isAnalyticsSuppressedPath('/'), false);
  assert.equal(isAnalyticsSuppressedPath('/help'), false);
  assert.equal(isAnalyticsSuppressedPath('/delete-account-help'), false);
  assert.equal(isAnalyticsSuppressedPath('/admin'), false);
});