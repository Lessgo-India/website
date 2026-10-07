import test from 'node:test';
import assert from 'node:assert/strict';
import { readBoundedJson } from '../boundedJsonBody.ts';
import { createIdempotentAction, newIdempotencyKey } from './idempotency.ts';
import { createPartnerBffHandlers } from './partnerBff.ts';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
/** Plain http on a LAN address (a phone on the dev server): no crypto.randomUUID. */
const insecureContext = { getRandomValues: (array) => crypto.getRandomValues(array) };

/** Predictable keys: key-1, key-2, … */
function counter() {
  let next = 0;
  return () => `key-${++next}`;
}

/** A write that records the key it was sent with, then fails like a gateway 504 (it may still have landed). */
function timingOut(sent) {
  return async (key) => {
    sent.push(key);
    throw Object.assign(new Error('The partner service took too long to respond.'), { status: 504 });
  };
}

function succeeding(sent) {
  return async (key) => {
    sent.push(key);
    return { id: `rdm_${sent.length}` };
  };
}

/** A write still in flight, settled by the test. */
function inFlight(sent) {
  const write = {};
  write.promise = new Promise((resolve, reject) => Object.assign(write, { resolve, reject }));
  write.run = (key) => {
    sent.push(key);
    return write.promise;
  };
  return write;
}

test('keys are random UUID v4s, with or without crypto.randomUUID', () => {
  const keys = new Set();
  for (let index = 0; index < 50; index += 1) {
    const secure = newIdempotencyKey();
    const fallback = newIdempotencyKey(insecureContext);
    assert.match(secure, UUID_V4);
    assert.match(fallback, UUID_V4);
    keys.add(secure).add(fallback);
  }
  assert.equal(keys.size, 100);
});

test('the partner BFF accepts generated keys and forwards them verbatim', async () => {
  const forwarded = [];
  const bff = createPartnerBffHandlers({
    enabled: () => true,
    callGateway: async (call) => {
      forwarded.push(call.idempotencyKey);
      return { status: 201, body: { id: 'rdm_1' } };
    },
    readJson: readBoundedJson,
    secureCookies: () => false,
    now: () => Date.now(),
  });
  for (const key of [newIdempotencyKey(), newIdempotencyKey(insecureContext)]) {
    const response = await bff.POST(
      new Request('http://local/api/partner/redemptions', {
        method: 'POST',
        headers: {
          origin: 'http://local',
          'sec-fetch-site': 'same-origin',
          'content-type': 'application/json',
          cookie: 'lessgo_partner_session=tok_9f8e7d6c5b4a39281706f5e4d3c2b1a0',
          'idempotency-key': key,
        },
        body: JSON.stringify({ voucherId: 'vch_1', outletId: 'out_1', billMinor: 120000 }),
      }),
      { params: Promise.resolve({ path: ['redemptions'] }) },
    );
    assert.equal(response.status, 201);
    assert.equal(forwarded.at(-1), key);
  }
});

test('every retry of a failed action sends the same key, until one succeeds', async () => {
  const action = createIdempotentAction(counter());
  const sent = [];
  // e.g. Confirm, 504; the cashier fixes the bill; Confirm, 504; Confirm, 201.
  await assert.rejects(action.attempt(timingOut(sent)), /too long/);
  await assert.rejects(action.attempt(timingOut(sent)), /too long/);
  assert.deepEqual(await action.attempt(succeeding(sent)), { id: 'rdm_3' });
  assert.deepEqual(sent, ['key-1', 'key-1', 'key-1']);
});

test('a success retires the key, so the next action gets a new one', async () => {
  const action = createIdempotentAction(counter());
  const sent = [];
  await action.attempt(succeeding(sent));
  await action.attempt(succeeding(sent));
  await assert.rejects(action.attempt(timingOut(sent)));
  await action.attempt(succeeding(sent));
  await action.attempt(succeeding(sent));
  assert.deepEqual(sent, ['key-1', 'key-2', 'key-3', 'key-3', 'key-4']);
});

test('restart (another voucher looked up, console reset) abandons the failed action’s key', async () => {
  let minted = 0;
  const mint = counter();
  const action = createIdempotentAction(() => {
    minted += 1;
    return mint();
  });
  action.restart();
  assert.equal(minted, 0, 'the first attempt mints the key, not restart');

  const sent = [];
  await assert.rejects(action.attempt(timingOut(sent)));
  action.restart();
  await assert.rejects(action.attempt(timingOut(sent)));
  await assert.rejects(action.attempt(timingOut(sent)));
  action.restart();
  await action.attempt(succeeding(sent));
  assert.deepEqual(sent, ['key-1', 'key-2', 'key-2', 'key-3']);
});

test('overlapping attempts share the key, and a late success never retires a newer action’s key', async () => {
  const action = createIdempotentAction(counter());
  const sent = [];
  const first = inFlight(sent);
  const doubleTap = inFlight(sent);
  const firstAttempt = action.attempt(first.run);
  const doubleTapAttempt = action.attempt(doubleTap.run);
  assert.deepEqual(sent, ['key-1', 'key-1']);

  // The cashier resets while key-1 is still in flight and moves on to another voucher.
  action.restart();
  const next = inFlight(sent);
  const nextAttempt = action.attempt(next.run);
  first.resolve({ id: 'rdm_1' });
  doubleTap.reject(new Error('This voucher was already redeemed.'));
  assert.deepEqual(await firstAttempt, { id: 'rdm_1' });
  await assert.rejects(doubleTapAttempt, /already redeemed/);

  next.reject(new Error('Network error. Check your connection and try again.'));
  await assert.rejects(nextAttempt, /Network error/);
  await action.attempt(succeeding(sent));
  assert.deepEqual(sent, ['key-1', 'key-1', 'key-2', 'key-2']);
});
