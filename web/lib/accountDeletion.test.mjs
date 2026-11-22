import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import {
  ACCOUNT_DELETION_STORAGE_KEY,
  AccountDeletionStorageError,
  clearAccountDeletionMarker,
  createAccountDeletionWorkflow,
  isAccountDeletionComplete,
  readAccountDeletionMarker,
  saveAccountDeletionMarker,
} from './accountDeletion.ts';

const JOB_ID = 'c3bf20e7-1337-42ec-a8cd-26e6b289439e';
const OTHER_JOB_ID = 'ab0375cb-2baf-46d2-9952-3cae26b82f15';
const TOKEN = 'a'.repeat(64);
const USER_ID = '9876543210';
const FIREBASE_UID = 'original-firebase-user';
const REPORT = {
  reports: 'anonymized: 2',
  notifications: 'ok',
  groups: 'ok',
  updates: 'ok',
  files: 'already absent',
  profile: 'ok',
  user: 'ok',
  firebase: 'ok',
};

function receipt(state = 'completed', jobId = JOB_ID) {
  return { jobId, state, report: { ...REPORT }, nextAttemptAt: null };
}

function preparing() {
  return { version: 1, phase: 'preparing', jobId: JOB_ID, firebaseUid: FIREBASE_UID, userId: USER_ID };
}

function deleting() {
  return { version: 1, phase: 'deleting', jobId: JOB_ID, firebaseUid: FIREBASE_UID, recoveryToken: TOKEN };
}

function cleanup() {
  return { version: 1, phase: 'cleanup', jobId: JOB_ID, firebaseUid: FIREBASE_UID };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function harness(respond) {
  const storage = memoryStorage();
  const calls = [];
  const progress = [];
  let tokenReads = 0;
  const getToken = async () => {
    tokenReads += 1;
    return 'firebase-id-token';
  };
  const workflow = createAccountDeletionWorkflow(async (path, options) => {
    calls.push({ path, options });
    if (options.auth) await options.auth();
    if (respond) return respond(path, options, storage);
    return path.endsWith('/account-deletion')
      ? { ...receipt('prepared'), recoveryToken: TOKEN }
      : receipt();
  });
  const options = {
    getToken,
    signal: new AbortController().signal,
    storage,
    onProgress: (marker, progressReceipt) => progress.push({ marker, receipt: progressReceipt }),
  };
  return { storage, calls, progress, workflow, options, tokenReads: () => tokenReads };
}

test('uses the exact mobile prepare, start and status methods and credentials', async () => {
  const h = harness();
  await h.workflow.prepare(USER_ID, JOB_ID, h.options.getToken, h.options.signal);
  await h.workflow.start(JOB_ID, TOKEN, h.options.signal);
  await h.workflow.status(JOB_ID, TOKEN, h.options.signal);

  assert.deepEqual(h.calls.map(({ path, options }) => [options.method, path]), [
    ['POST', `/users/${USER_ID}/account-deletion`],
    ['POST', `/account-deletions/${JOB_ID}/start`],
    ['GET', `/account-deletions/${JOB_ID}`],
  ]);
  assert.deepEqual(h.calls[0].options.body, { jobId: JOB_ID });
  assert.deepEqual(h.calls[0].options.headers, { 'Idempotency-Key': JOB_ID });
  assert.equal(h.calls[0].options.auth, h.options.getToken);
  assert.deepEqual(h.calls[1].options.headers, {
    'x-account-deletion-token': TOKEN,
    'Idempotency-Key': JOB_ID,
  });
  assert.deepEqual(h.calls[2].options.headers, { 'x-account-deletion-token': TOKEN });
  for (const { path, options } of h.calls) {
    assert.equal(options.timeoutMs, 30_000);
    assert.equal(options.signal, h.options.signal);
    assert.equal(path.includes(TOKEN), false);
  }
  for (const { options } of h.calls.slice(1)) {
    assert.equal(Object.hasOwn(options, 'auth'), false);
    assert.equal(Object.hasOwn(options, 'body'), false);
  }
  assert.equal(h.tokenReads(), 1);
});

test('accepts the gateway canonical job ID when preparation deduplicates an existing job', async () => {
  const h = harness(() => ({ ...receipt('prepared', OTHER_JOB_ID), recoveryToken: TOKEN }));
  const result = await h.workflow.prepare(USER_ID, JOB_ID, h.options.getToken);
  assert.equal(result.jobId, OTHER_JOB_ID);
  assert.equal(h.calls[0].options.headers['Idempotency-Key'], JOB_ID);
});

test('rejects invalid identities and recovery credentials before sending a request', async () => {
  const h = harness();
  for (const [userId, jobId] of [['bad-user', JOB_ID], [USER_ID, 'not-a-uuid']]) {
    await assert.rejects(h.workflow.prepare(userId, jobId, h.options.getToken), /identity could not be verified/);
  }
  for (const [jobId, token] of [[JOB_ID, 'bad-token'], ['not-a-uuid', TOKEN]]) {
    await assert.rejects(h.workflow.start(jobId, token), /recovery could not be verified/);
    await assert.rejects(h.workflow.status(jobId, token), /recovery could not be verified/);
  }
  assert.equal(h.calls.length, 0);
});

test('accepts every mobile deletion state without treating pending work as completed', async () => {
  for (const state of ['prepared', 'queued', 'running', 'retrying', 'completed']) {
    const h = harness(() => receipt(state));
    const result = await h.workflow.status(JOB_ID, TOKEN);
    assert.equal(result.state, state);
    assert.equal(isAccountDeletionComplete(result), state === 'completed');
  }
});

test('rejects malformed, legacy and mismatched progress receipts', async () => {
  const invalid = [
    null,
    { success: true, report: REPORT },
    { ...receipt(), jobId: 'not-a-uuid' },
    { ...receipt(), state: 'success' },
    { ...receipt(), report: [] },
    { ...receipt(), report: null },
    { ...receipt(), nextAttemptAt: 42 },
    receipt('completed', OTHER_JOB_ID),
  ];
  for (const data of invalid) {
    const h = harness(() => data);
    await assert.rejects(h.workflow.start(JOB_ID, TOKEN), /progress could not be confirmed/);
    await assert.rejects(h.workflow.status(JOB_ID, TOKEN), /progress could not be confirmed/);
  }
});

test('requires confirmed cleanup for every component, not merely a completed state', async () => {
  for (const component of Object.keys(REPORT)) {
    for (const status of [undefined, 'pending', 'failed: unavailable', 'unexpected']) {
      const report = { ...REPORT, [component]: status };
      const h = harness(() => ({ ...receipt(), report }));
      await assert.rejects(h.workflow.status(JOB_ID, TOKEN), /progress could not be confirmed/);
      assert.equal(isAccountDeletionComplete({ ...receipt(), report }), false);
    }
  }
  const h = harness(() => ({ ...receipt(), report: { ...REPORT, reports: 'ok' } }));
  await assert.rejects(h.workflow.status(JOB_ID, TOKEN), /progress could not be confirmed/);
});

test('requires a valid recovery token before preparation can advance', async () => {
  for (const token of [undefined, null, 'short', 'G'.repeat(64)]) {
    const h = harness(() => ({ ...receipt('prepared'), recoveryToken: token }));
    saveAccountDeletionMarker(preparing(), h.storage);
    await assert.rejects(h.workflow.resume(preparing(), h.options), /recovery could not be secured/);
    assert.equal(h.calls.length, 1);
    assert.deepEqual(readAccountDeletionMarker(h.storage), preparing());
  }
});

test('persists and restores every recovery phase while dropping unneeded private fields', () => {
  const storage = memoryStorage();
  assert.equal(readAccountDeletionMarker(storage), null);
  for (const marker of [preparing(), deleting(), cleanup()]) {
    saveAccountDeletionMarker({ ...marker, extra: 'discard me' }, storage);
    assert.deepEqual(readAccountDeletionMarker(storage), marker);
  }
  clearAccountDeletionMarker(cleanup(), storage);
  assert.equal(readAccountDeletionMarker(storage), null);
});

test('rejects corrupt stored data without including recovery credentials in the error', () => {
  const storage = memoryStorage();
  for (const raw of [
    `{"recoveryToken":"${TOKEN}"`,
    JSON.stringify({ ...deleting(), version: 2 }),
    JSON.stringify({ ...deleting(), jobId: 'bad' }),
    JSON.stringify({ ...deleting(), recoveryToken: 'bad' }),
    JSON.stringify({ ...preparing(), userId: 'bad' }),
    JSON.stringify({ ...cleanup(), firebaseUid: '' }),
    JSON.stringify({ ...cleanup(), phase: 'unknown' }),
  ]) {
    storage.setItem(ACCOUNT_DELETION_STORAGE_KEY, raw);
    assert.throws(() => readAccountDeletionMarker(storage), (error) => {
      assert.ok(error instanceof AccountDeletionStorageError);
      assert.match(error.message, /progress is invalid/);
      assert.equal(error.message.includes(TOKEN), false);
      return true;
    });
    assert.equal(storage.getItem(ACCOUNT_DELETION_STORAGE_KEY), raw);
  }
});

test('surfaces unavailable and unconfirmed browser storage instead of silently proceeding', () => {
  const denied = {
    getItem: () => { throw new Error('denied'); },
    setItem: () => { throw new Error('denied'); },
    removeItem: () => { throw new Error('denied'); },
  };
  assert.throws(() => readAccountDeletionMarker(denied), /storage is unavailable/);
  assert.throws(() => saveAccountDeletionMarker(preparing(), denied), /progress could not be saved/);
  const unconfirmed = memoryStorage();
  unconfirmed.setItem = () => {};
  assert.throws(() => saveAccountDeletionMarker(preparing(), unconfirmed), /progress could not be saved/);
});

test('persists recovery before starting and removes its credential after full completion', async () => {
  const h = harness((path, options, storage) => {
    if (path.endsWith('/account-deletion')) return { ...receipt('prepared'), recoveryToken: TOKEN };
    assert.deepEqual(readAccountDeletionMarker(storage), deleting());
    assert.equal(options.auth, undefined);
    return receipt();
  });
  saveAccountDeletionMarker(preparing(), h.storage);
  assert.deepEqual(await h.workflow.resume(preparing(), h.options), cleanup());
  assert.deepEqual(readAccountDeletionMarker(h.storage), cleanup());
  assert.deepEqual(h.progress.map(({ marker }) => marker.phase), [
    'preparing', 'deleting', 'deleting', 'cleanup',
  ]);
  assert.equal(h.tokenReads(), 1);
  assert.equal(h.storage.getItem(ACCOUNT_DELETION_STORAGE_KEY).includes(TOKEN), false);
});

test('does not start deletion when the recovery credential cannot be saved', async () => {
  const h = harness();
  saveAccountDeletionMarker(preparing(), h.storage);
  const setItem = h.storage.setItem;
  h.storage.setItem = (key, raw) => {
    if (JSON.parse(raw).phase === 'deleting') throw new Error('quota exceeded');
    setItem(key, raw);
  };
  await assert.rejects(h.workflow.resume(preparing(), h.options), /progress could not be saved/);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(readAccountDeletionMarker(h.storage), preparing());

  h.storage.setItem = setItem;
  await h.workflow.resume(readAccountDeletionMarker(h.storage), h.options);
  assert.equal(h.calls[0].options.body.jobId, h.calls[1].options.body.jobId);
  assert.deepEqual(readAccountDeletionMarker(h.storage), cleanup());
});

test('keeps the original preparation intent after a lost response and retries the same key', async () => {
  let failed = false;
  const h = harness((path) => {
    if (!failed) {
      failed = true;
      throw new Error('connection lost');
    }
    return path.endsWith('/account-deletion')
      ? { ...receipt('prepared'), recoveryToken: TOKEN }
      : receipt();
  });
  saveAccountDeletionMarker(preparing(), h.storage);
  await assert.rejects(h.workflow.resume(preparing(), h.options), /connection lost/);
  assert.deepEqual(readAccountDeletionMarker(h.storage), preparing());
  await h.workflow.resume(readAccountDeletionMarker(h.storage), h.options);
  assert.deepEqual(h.calls.slice(0, 2).map(({ options }) => options.headers), [
    { 'Idempotency-Key': JOB_ID }, { 'Idempotency-Key': JOB_ID },
  ]);
});

test('resumes a lost start response without Firebase authentication or another preparation', async () => {
  let failed = false;
  const h = harness(() => {
    if (!failed) {
      failed = true;
      throw new Error('connection lost after start');
    }
    return receipt();
  });
  h.options.getToken = async () => { throw new Error('Firebase account no longer exists'); };
  saveAccountDeletionMarker(deleting(), h.storage);
  await assert.rejects(h.workflow.resume(deleting(), h.options), /connection lost after start/);
  assert.deepEqual(readAccountDeletionMarker(h.storage), deleting());
  await h.workflow.resume(readAccountDeletionMarker(h.storage), h.options);
  assert.deepEqual(h.calls.map(({ path, options }) => [path, options.headers]), [
    [`/account-deletions/${JOB_ID}/start`, { 'x-account-deletion-token': TOKEN, 'Idempotency-Key': JOB_ID }],
    [`/account-deletions/${JOB_ID}/start`, { 'x-account-deletion-token': TOKEN, 'Idempotency-Key': JOB_ID }],
  ]);
  assert.deepEqual(readAccountDeletionMarker(h.storage), cleanup());
});

test('polls every two seconds through server retries and only then advances to cleanup', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const states = ['queued', 'retrying', 'running', 'completed'];
  const h = harness(() => receipt(states.shift()));
  saveAccountDeletionMarker(deleting(), h.storage);
  const promise = h.workflow.resume(deleting(), h.options);
  await setImmediate();
  assert.equal(h.calls.length, 1);
  t.mock.timers.tick(1_999);
  await setImmediate();
  assert.equal(h.calls.length, 1);
  t.mock.timers.tick(1);
  await setImmediate();
  assert.equal(h.calls.length, 2);
  assert.equal(readAccountDeletionMarker(h.storage).phase, 'deleting');
  for (let index = 0; index < 2; index += 1) {
    t.mock.timers.tick(2_000);
    await setImmediate();
  }
  assert.deepEqual(await promise, cleanup());
  assert.deepEqual(h.progress.filter(({ receipt: progress }) => progress).map(({ receipt: progress }) => progress.state), [
    'queued', 'retrying', 'running', 'completed', 'completed',
  ]);
  assert.deepEqual(h.calls.slice(1).map(({ options }) => options.method), ['GET', 'GET', 'GET']);
});

test('cancels polling on navigation without losing the recovery credential', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = harness(() => receipt('running'));
  const controller = new AbortController();
  h.options.signal = controller.signal;
  saveAccountDeletionMarker(deleting(), h.storage);
  const promise = h.workflow.resume(deleting(), h.options);
  const rejected = assert.rejects(promise, { name: 'AbortError' });
  await setImmediate();
  controller.abort();
  await rejected;
  t.mock.timers.tick(10_000);
  await setImmediate();
  assert.equal(h.calls.length, 1);
  assert.deepEqual(readAccountDeletionMarker(h.storage), deleting());
});

test('never starts a destructive request after preparation was cancelled', async () => {
  const controller = new AbortController();
  const h = harness(() => {
    controller.abort();
    return { ...receipt('prepared'), recoveryToken: TOKEN };
  });
  h.options.signal = controller.signal;
  saveAccountDeletionMarker(preparing(), h.storage);
  await assert.rejects(h.workflow.resume(preparing(), h.options), { name: 'AbortError' });
  assert.equal(h.calls.length, 1);
  assert.deepEqual(readAccountDeletionMarker(h.storage), preparing());
});

test('keeps recovery when a completed receipt has unconfirmed cleanup', async () => {
  const h = harness(() => ({ ...receipt(), report: { ...REPORT, firebase: 'pending' } }));
  saveAccountDeletionMarker(deleting(), h.storage);
  await assert.rejects(h.workflow.resume(deleting(), h.options), /progress could not be confirmed/);
  assert.deepEqual(readAccountDeletionMarker(h.storage), deleting());
  assert.equal(h.progress.some(({ marker }) => marker.phase === 'cleanup'), false);
});

test('keeps a usable capability if saving the completed phase fails', async () => {
  const h = harness();
  saveAccountDeletionMarker(deleting(), h.storage);
  const setItem = h.storage.setItem;
  h.storage.setItem = (key, raw) => {
    if (JSON.parse(raw).phase === 'cleanup') throw new Error('quota exceeded');
    setItem(key, raw);
  };
  await assert.rejects(h.workflow.resume(deleting(), h.options), /progress could not be saved/);
  assert.deepEqual(readAccountDeletionMarker(h.storage), deleting());
  h.storage.setItem = setItem;
  assert.deepEqual(await h.workflow.resume(readAccountDeletionMarker(h.storage), h.options), cleanup());
});

test('reloading during browser cleanup never repeats server deletion or requires a Firebase token', async () => {
  const h = harness(() => { throw new Error('no server request expected'); });
  h.options.getToken = async () => { throw new Error('no Firebase token expected'); };
  saveAccountDeletionMarker(cleanup(), h.storage);
  assert.deepEqual(await h.workflow.resume(readAccountDeletionMarker(h.storage), h.options), cleanup());
  assert.equal(h.calls.length, 0);
});

test('cleanup preserves a newer account deletion saved in another tab', () => {
  const storage = memoryStorage();
  const newer = { ...preparing(), jobId: OTHER_JOB_ID, firebaseUid: 'new-firebase-user' };
  saveAccountDeletionMarker(newer, storage);
  assert.throws(() => clearAccountDeletionMarker(cleanup(), storage), /Another deletion is saved/);
  assert.deepEqual(readAccountDeletionMarker(storage), newer);
});

test('cleanup reports failed removal and retains the completed marker for retry', () => {
  const storage = memoryStorage();
  saveAccountDeletionMarker(cleanup(), storage);
  storage.removeItem = () => {};
  assert.throws(() => clearAccountDeletionMarker(cleanup(), storage), /could not be cleared/);
  assert.deepEqual(readAccountDeletionMarker(storage), cleanup());
});
