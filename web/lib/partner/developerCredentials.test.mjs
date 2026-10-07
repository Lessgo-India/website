import test from 'node:test';
import assert from 'node:assert/strict';
import {
  base64Url,
  developerCredentialAccessRefusal,
  developerCredentialPreview,
  developerCredentialsOf,
  generateDeveloperCredential,
  isWellFormedDeveloperCredential,
  randomBase62,
  rotateDeveloperCredentialIn,
} from './developerCredentials.ts';

const NOW = Date.parse('2026-10-07T18:00:00.000Z');
const cryptoBytes = (count) => crypto.getRandomValues(new Uint8Array(count));

function partner(overrides = {}) {
  return {
    id: 'ptr_stylecart',
    handle: 'stylecart',
    status: 'active',
    brandName: 'StyleCart',
    legalName: 'StyleCart Retail Pvt Ltd',
    logoEmoji: '🛍️',
    brandColor: '#FF6F91',
    category: 'Shopping',
    channels: ['online_code'],
    website: 'https://stylecart.example',
    gstin: '29AADCS7741F1Z0',
    contactName: 'Tanvi Kapoor',
    contactEmail: 'brands@stylecart.example',
    contactPhone: '9876500012',
    city: 'Bengaluru',
    stateCode: 'KA',
    plan: 'standard',
    onboardedAt: '2026-08-16T10:00:00.000Z',
    integration: {
      apiKeyPreview: 'lgp_live_••••9e20',
      checkout: {
        status: 'live',
        allowedDomains: ['stylecart.example'],
        sandboxKeyPreview: 'lgp_test_••••c4d1',
        liveKeyPreview: 'lgp_live_••••9e20',
        liveSince: '2026-08-29T10:00:00.000Z',
      },
    },
    ...overrides,
  };
}

const rotate = (account, role, records, type) =>
  rotateDeveloperCredentialIn(account, role, records, type, { now: NOW, randomBytes: cryptoBytes });

/** A ShowSpot-like partner that only takes bookings through its own API. */
function bookingOnly() {
  return partner({
    id: 'ptr_showspot',
    handle: 'showspot',
    brandName: 'ShowSpot',
    channels: ['api_booking'],
    website: 'https://showspot.example',
    integration: {
      apiKeyPreview: 'lgp_live_••••spot',
      webhookUrl: 'https://hooks.showspot.example/lessgo',
      webhookSecretPreview: 'whsec_••••0b6e',
      booking: {
        status: 'live',
        method: 'lessgo_connect',
        products: ['movie_tickets'],
        sandboxBaseUrl: 'https://sandbox.api.showspot.example/lessgo',
        liveBaseUrl: 'https://api.showspot.example/lessgo',
        auth: 'oauth2_client_credentials',
        clientId: 'lessgo-showspot',
        secretPreview: '••••a91d',
        liveSince: '2026-09-06T10:00:00.000Z',
      },
    },
  });
}

test('generates keys and secrets in the Partner API formats', () => {
  const seen = new Set();
  for (let index = 0; index < 50; index += 1) {
    for (const type of ['test_key', 'live_key', 'signing_secret']) {
      const value = generateDeveloperCredential(type, cryptoBytes);
      assert.equal(isWellFormedDeveloperCredential(type, value), true, value);
      seen.add(value);
    }
  }
  assert.equal(seen.size, 150);
  assert.match(generateDeveloperCredential('test_key', cryptoBytes), /^lgp_test_[0-9A-Za-z]{32}$/);
  assert.match(generateDeveloperCredential('live_key', cryptoBytes), /^lgp_live_[0-9A-Za-z]{32}$/);
  assert.match(generateDeveloperCredential('signing_secret', cryptoBytes), /^whsec_[A-Za-z0-9_-]{43}$/);
  assert.equal(isWellFormedDeveloperCredential('live_key', 'lgp_test_' + 'a'.repeat(32)), false);
});

test('draws base62 without modulo bias and encodes base64url without padding', () => {
  // 248–255 would favour the first eight characters, so they're skipped.
  const bytes = [255, 248, 0, 247, 61, 62, 10];
  const fixed = (count) => Uint8Array.from({ length: count }, (_, index) => bytes[index % bytes.length]);
  assert.equal(randomBase62(5, fixed), '0zz0A');
  assert.equal(base64Url(Uint8Array.from([251, 255, 191])), '-_-_');
  assert.equal(base64Url(new Uint8Array(32)).length, 43);
});

test('previews keep the prefix and the last four characters only', () => {
  const key = 'lgp_live_' + 'A'.repeat(28) + 'x9Z2';
  assert.equal(developerCredentialPreview('live_key', key), 'lgp_live_••••x9Z2');
  assert.equal(developerCredentialPreview('signing_secret', 'whsec_' + 'b'.repeat(39) + 'Qq_-'), 'whsec_••••Qq_-');
});

test('lists previews with the date each credential was issued', () => {
  const account = partner({ integration: { ...partner().integration, webhookSecretPreview: 'whsec_••••91c2' } });
  assert.deepEqual(developerCredentialsOf(account), {
    testKey: { preview: 'lgp_test_••••c4d1', createdAt: '2026-08-16T10:00:00.000Z' },
    liveKey: { preview: 'lgp_live_••••9e20', createdAt: '2026-08-29T10:00:00.000Z' },
    signingSecret: { preview: 'whsec_••••91c2', createdAt: '2026-08-16T10:00:00.000Z' },
    liveAvailable: true,
  });

  const testing = partner();
  testing.integration.checkout = { status: 'testing', allowedDomains: [], sandboxKeyPreview: 'lgp_test_••••aaaa' };
  assert.deepEqual(developerCredentialsOf(testing), {
    testKey: { preview: 'lgp_test_••••aaaa', createdAt: '2026-08-16T10:00:00.000Z' },
    liveKey: null,
    signingSecret: null,
    liveAvailable: false,
  });
});

test('rotation revokes the old preview and reveals the new value once', () => {
  const account = partner();
  const records = {};
  const result = rotate(account, 'owner', records, 'test_key');
  assert.equal(result.ok, true);
  const { revealed } = result;
  assert.equal(revealed.type, 'test_key');
  assert.equal(isWellFormedDeveloperCredential('test_key', revealed.value), true);
  assert.equal(revealed.preview, `lgp_test_••••${revealed.value.slice(-4)}`);
  assert.equal(revealed.createdAt, new Date(NOW).toISOString());
  assert.equal(result.replaced, true);

  assert.notEqual(account.integration.checkout.sandboxKeyPreview, 'lgp_test_••••c4d1');
  assert.equal(account.integration.checkout.sandboxKeyPreview, revealed.preview);
  assert.deepEqual(developerCredentialsOf(account, records).testKey, {
    preview: revealed.preview,
    createdAt: revealed.createdAt,
  });
  // Nothing else changed, and the full value is never stored.
  assert.equal(account.integration.checkout.liveKeyPreview, 'lgp_live_••••9e20');
  assert.equal(JSON.stringify({ account, records }).includes(revealed.value), false);

  const again = rotate(account, 'owner', records, 'test_key');
  assert.notEqual(again.revealed.value, revealed.value);
  assert.notEqual(again.revealed.preview, revealed.preview);
  assert.equal(account.integration.checkout.sandboxKeyPreview, again.revealed.preview);
});

test('a live key needs the checkout to be live, and replaces the account’s API key preview', () => {
  const pending = partner();
  pending.integration.checkout.status = 'ready_for_review';
  const before = structuredClone(pending);
  const refused = rotate(pending, 'owner', {}, 'live_key');
  assert.deepEqual(refused, {
    ok: false,
    status: 409,
    code: 'integration_not_live',
    message: 'A live key can be generated once Lessgo approves your checkout for production.',
  });
  assert.deepEqual(pending, before);
  // Sandbox keys and the signing secret don't wait for go-live.
  assert.equal(rotate(pending, 'owner', {}, 'test_key').ok, true);
  assert.equal(rotate(pending, 'owner', {}, 'signing_secret').ok, true);

  const live = partner();
  const records = {};
  const result = rotate(live, 'owner', records, 'live_key');
  assert.equal(result.ok, true);
  assert.equal(live.integration.checkout.liveKeyPreview, result.revealed.preview);
  assert.equal(live.integration.apiKeyPreview, result.revealed.preview);
  assert.notEqual(live.integration.apiKeyPreview, 'lgp_live_••••9e20');
  assert.equal(developerCredentialsOf(live, records).liveKey.createdAt, new Date(NOW).toISOString());
});

test('the signing secret updates the account’s secret preview; the first one isn’t a replacement', () => {
  const account = partner();
  const first = rotate(account, 'owner', {}, 'signing_secret');
  assert.equal(first.replaced, false);
  assert.equal(account.integration.webhookSecretPreview, first.revealed.preview);
  assert.match(first.revealed.preview, /^whsec_••••[A-Za-z0-9_-]{4}$/);
  const second = rotate(account, 'owner', {}, 'signing_secret');
  assert.equal(second.replaced, true);
  assert.equal(account.integration.webhookSecretPreview, second.revealed.preview);
});

test('only owners of partners with an online channel can see or rotate credentials', () => {
  for (const role of ['manager', 'cashier']) {
    const account = partner();
    const before = structuredClone(account);
    const records = {};
    assert.deepEqual(rotate(account, role, records, 'test_key'), {
      ok: false,
      status: 403,
      code: 'forbidden',
      message: 'Only the account owner can manage integrations.',
    });
    assert.equal(rotate(bookingOnly(), role, {}, 'signing_secret').code, 'forbidden');
    assert.deepEqual(account, before);
    assert.deepEqual(records, {});
    assert.equal(developerCredentialAccessRefusal(account, role).code, 'forbidden');
  }

  const inStore = partner({ channels: ['in_store'], integration: { apiKeyPreview: 'lgp_live_••••bros' } });
  assert.equal(developerCredentialAccessRefusal(inStore, 'owner').status, 404);
  assert.equal(rotate(inStore, 'owner', {}, 'signing_secret').code, 'not_found');
  assert.equal(developerCredentialAccessRefusal(partner(), 'owner'), null);
  assert.equal(developerCredentialAccessRefusal(bookingOnly(), 'owner'), null);

  const unknownType = rotate(partner(), 'owner', {}, 'master_key');
  assert.equal(unknownType.status, 400);
  assert.equal(unknownType.code, 'invalid_input');
});

test('booking-only partners get just the signing secret; API keys are not applicable', () => {
  const account = bookingOnly();
  assert.deepEqual(developerCredentialsOf(account), {
    testKey: null,
    liveKey: null,
    signingSecret: { preview: 'whsec_••••0b6e', createdAt: account.onboardedAt },
    liveAvailable: false,
  });

  const before = structuredClone(account);
  for (const type of ['test_key', 'live_key']) {
    assert.deepEqual(rotate(account, 'owner', {}, type), {
      ok: false,
      status: 409,
      code: 'not_applicable',
      message: 'API keys are only for online checkout. Your booking webhooks need just the signing secret.',
    });
  }
  assert.deepEqual(account, before);

  const records = {};
  const result = rotate(account, 'owner', records, 'signing_secret');
  assert.equal(result.ok, true);
  assert.equal(result.replaced, true);
  assert.equal(isWellFormedDeveloperCredential('signing_secret', result.revealed.value), true);
  assert.equal(account.integration.webhookSecretPreview, result.revealed.preview);
  assert.notEqual(account.integration.webhookSecretPreview, 'whsec_••••0b6e');
  assert.deepEqual(developerCredentialsOf(account, records), {
    testKey: null,
    liveKey: null,
    signingSecret: { preview: result.revealed.preview, createdAt: new Date(NOW).toISOString() },
    liveAvailable: false,
  });
  // The booking connection itself is untouched.
  assert.deepEqual(account.integration.booking, before.integration.booking);
});

test('hybrid partners (online checkout + bookings) get every credential', () => {
  const account = partner({
    channels: ['online_code', 'api_booking'],
    integration: {
      ...partner().integration,
      webhookSecretPreview: 'whsec_••••91c2',
      booking: bookingOnly().integration.booking,
    },
  });
  const view = developerCredentialsOf(account);
  assert.deepEqual(
    [view.testKey?.preview, view.liveKey?.preview, view.signingSecret?.preview, view.liveAvailable],
    ['lgp_test_••••c4d1', 'lgp_live_••••9e20', 'whsec_••••91c2', true],
  );
  for (const type of ['test_key', 'live_key', 'signing_secret']) {
    assert.equal(rotate(account, 'owner', {}, type).ok, true, type);
  }
});

test('API key previews left over after online checkout is removed aren’t listed', () => {
  // e.g. Lessgo moved the partner to bookings only; the old checkout data lingers.
  const account = bookingOnly();
  account.integration.checkout = partner().integration.checkout;
  assert.equal(developerCredentialsOf(account).testKey, null);
  assert.equal(developerCredentialsOf(account).liveKey, null);
  assert.equal(rotate(account, 'owner', {}, 'test_key').code, 'not_applicable');
});

test('a preview re-issued by Lessgo isn’t dated by an older rotation', () => {
  const account = partner();
  const records = {};
  rotate(account, 'owner', records, 'test_key');
  // e.g. an admin removed and re-added online checkout: a fresh sandbox key.
  account.integration.checkout.sandboxKeyPreview = 'lgp_test_••••new1';
  assert.deepEqual(developerCredentialsOf(account, records).testKey, {
    preview: 'lgp_test_••••new1',
    createdAt: account.onboardedAt,
  });
});
