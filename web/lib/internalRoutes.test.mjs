import test from 'node:test';
import assert from 'node:assert/strict';
import { isInternalToolPath } from './internalRoutes.ts';

test('treats the admin console and partner portal as internal tools', () => {
  for (const path of ['/admin', '/admin/', '/admin/reports', '/partner', '/partner/login', '/partner/campaigns/new']) {
    assert.equal(isInternalToolPath(path), true, path);
  }
});

test('leaves public and lookalike routes alone', () => {
  for (const path of ['/', '/features', '/partners', '/partnership', '/administrator', '/e/abc']) {
    assert.equal(isInternalToolPath(path), false, path);
  }
  assert.equal(isInternalToolPath(null), false);
  assert.equal(isInternalToolPath(undefined), false);
});
