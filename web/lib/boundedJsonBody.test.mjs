import test from 'node:test';
import assert from 'node:assert/strict';
import { readBoundedJson } from './boundedJsonBody.ts';

const encoder = new TextEncoder();

function streamOf(...chunks) {
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

test('parses JSON split across bounded request chunks', async () => {
  assert.deepEqual(
    await readBoundedJson(streamOf('{"phone":"999', '9999999"}'), 64),
    { ok: true, value: { phone: '9999999999' } },
  );
});

test('stops reading once a chunked body exceeds the byte limit', async () => {
  assert.deepEqual(
    await readBoundedJson(streamOf('{"value":"', 'x'.repeat(64), '"}'), 32),
    { ok: false, reason: 'too-large' },
  );
});

test('rejects malformed bounded JSON', async () => {
  assert.deepEqual(await readBoundedJson(streamOf('{bad'), 64), {
    ok: false,
    reason: 'invalid',
  });
});
