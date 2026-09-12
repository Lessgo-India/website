import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rateLimitSubjects,
  trustedClientAddress,
} from './adminLoginRateLimitPolicy.js';

test('uses the last trusted forwarded address rather than a spoofable first value', () => {
  const headers = new Headers({
    'x-forwarded-for': '203.0.113.9, 198.51.100.4',
    'x-real-ip': '192.0.2.3',
  });
  assert.equal(trustedClientAddress(headers), '198.51.100.4');
});

test('rejects malformed proxy addresses and falls back to a valid real address', () => {
  const headers = new Headers({
    'x-forwarded-for': 'attacker-controlled',
    'x-real-ip': '192.0.2.3',
  });
  assert.equal(trustedClientAddress(headers), '192.0.2.3');
});

test('uses address, address-phone, and phone-wide buckets when an address is known', () => {
  assert.deepEqual(rateLimitSubjects('198.51.100.4', '9999999999'), [
    { scope: 'address', value: '198.51.100.4', limit: 20 },
    {
      scope: 'address-phone',
      value: '198.51.100.4:9999999999',
      limit: 5,
    },
    { scope: 'phone', value: '9999999999', limit: 5 },
  ]);
});

test('does not let an unknown shared address lock every administrator out', () => {
  assert.deepEqual(rateLimitSubjects('unknown', '9999999999'), [
    { scope: 'phone', value: '9999999999', limit: 5 },
  ]);
});
