import test from 'node:test';
import assert from 'node:assert/strict';
import {
  baseUserId,
  buildInviteMessage,
  checkGstin,
  formatIndianMobile,
  generateTemporaryPassword,
  gstinCheckChar,
  handleProblem,
  hasOnboardingErrors,
  isValidEmail,
  isValidIndianMobile,
  isValidUserId,
  maskEmail,
  normaliseIndianMobile,
  suggestHandle,
  TEMPORARY_PASSWORD_PATTERN,
  uniqueUserId,
  validateOnboarding,
  categoryDefaults,
} from './onboarding.ts';

const cryptoBytes = (count) => crypto.getRandomValues(new Uint8Array(count));

test('suggests handles from brand names', () => {
  assert.equal(suggestHandle('Brew Bros Café'), 'brewbros');
  assert.equal(suggestHandle('Masala Magic Kitchens Pvt Ltd'), 'masalamagic');
  assert.equal(suggestHandle('The Bombay Canteen'), 'bombaycanteen');
  assert.equal(suggestHandle('99 Pancakes'), 'pancakes');
  assert.equal(suggestHandle('Supercalifragilistic Expialidocious'), 'supercalifragili');
});

test('validates handles and keeps them unique', () => {
  assert.equal(handleProblem('masalamagic', ['brewbros']), null);
  assert.match(handleProblem('brewbros', ['brewbros']), /already used/);
  assert.match(handleProblem('ab'), /3–16/);
  assert.match(handleProblem('9lives'), /starting with a letter/);
  assert.match(handleProblem('Brew.Bros'), /lowercase/);
});

test('derives user IDs per role and de-duplicates them', () => {
  assert.equal(baseUserId('brewbros', 'owner'), 'brewbros.owner');
  assert.equal(baseUserId('brewbros', 'manager'), 'brewbros.manager');
  assert.equal(baseUserId('brewbros', 'cashier', 'Brew Bros – HSR Layout'), 'brewbros.hsrlayout');
  assert.equal(baseUserId('chaatstreet', 'cashier', 'Chaat Street – Sector 18'), 'chaatstreet.sector18');
  assert.equal(baseUserId('brewbros', 'cashier'), 'brewbros.counter');
  const taken = new Set(['brewbros.owner', 'brewbros.owner2']);
  assert.equal(uniqueUserId('brewbros.owner', taken), 'brewbros.owner3');
  assert.equal(uniqueUserId('brewbros.manager', taken), 'brewbros.manager');
  assert.equal(isValidUserId('brewbros.hsrlayout'), true);
  assert.equal(isValidUserId('brewbros'), false);
});

test('normalises and validates Indian mobile numbers', () => {
  assert.equal(normaliseIndianMobile('+91 98450-12345'), '9845012345');
  assert.equal(normaliseIndianMobile('098450 12345'), '9845012345');
  assert.equal(isValidIndianMobile('9845012345'), true);
  assert.equal(isValidIndianMobile('5845012345'), false);
  assert.equal(isValidIndianMobile('984501234'), false);
  assert.equal(formatIndianMobile('9845012345'), '+91 98450 12345');
});

test('validates and masks email addresses', () => {
  assert.equal(isValidEmail('owner@masalamagic.example'), true);
  assert.equal(isValidEmail('owner@masalamagic'), false);
  assert.equal(isValidEmail('owner masala@x.in'), false);
  assert.equal(maskEmail('pooja@chaatstreet.example'), 'p•••a@chaatstreet.example');
});

test('checks GSTINs: format, check character and state', () => {
  // GSTN's published worked example.
  assert.equal(gstinCheckChar('27AAPFU0939F1Z'), 'V');
  assert.deepEqual(checkGstin('27aapfu0939f1zv'), { registeredIn: 'MH' });
  assert.deepEqual(checkGstin('27AAPFU0939F1ZV', 'MH'), { registeredIn: 'MH' });
  assert.match(checkGstin('27AAPFU0939F1ZV', 'KA').warning, /different state/);
  assert.match(checkGstin('27AAPFU0939F1ZW').error, /typo/);
  assert.match(checkGstin('27AAPFU0939F1').error, /15 characters/);
  const first14 = '99AAPFU0939F1Z';
  assert.match(checkGstin(first14 + gstinCheckChar(first14)).error, /isn’t an Indian GST state code/);
  // Pre-2014 Andhra Pradesh registrations still validate for AP.
  const ap = '28AAPFU0939F1Z';
  assert.deepEqual(checkGstin(ap + gstinCheckChar(ap), 'AP'), { registeredIn: 'AP' });
});

test('generates readable, uniformly random temporary passwords', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i += 1) {
    const password = generateTemporaryPassword(cryptoBytes);
    assert.match(password, TEMPORARY_PASSWORD_PATTERN);
    assert.doesNotMatch(password, /[0O1Il]/);
    seen.add(password);
  }
  assert.equal(seen.size, 200);

  // Bytes at or above the rejection limit (228 for a 57-letter alphabet) are skipped.
  let calls = 0;
  const skewed = (count) => {
    calls += 1;
    return new Uint8Array(count).fill(calls === 1 ? 250 : 0);
  };
  assert.equal(generateTemporaryPassword(skewed), 'AAAA-AAAA-AAAA');
  assert.equal(calls, 2);
});

test('builds the invite message', () => {
  const { subject, body } = buildInviteMessage({
    brandName: 'Masala Magic',
    recipientName: 'Anita Rao',
    userId: 'masalamagic.owner',
    temporaryPassword: 'Kx7m-Q2pv-9Rbd',
    loginUrl: 'https://partners.example/login',
    expiresLabel: '10 Oct, 7:30 pm',
  });
  assert.equal(subject, 'Your Lessgo Partners login for Masala Magic');
  assert.match(body, /^Hi Anita,/);
  assert.match(body, /User ID: masalamagic\.owner/);
  assert.match(body, /Temporary password: Kx7m-Q2pv-9Rbd/);
  assert.match(body, /until 10 Oct, 7:30 pm/);
});

function onboardingInput(overrides = {}) {
  const first14 = '29AABCM1234K1Z';
  return {
    brandName: 'Masala Magic',
    legalName: 'Masala Magic Kitchens Pvt Ltd',
    category: 'Food & Drinks',
    channels: ['in_store'],
    website: '',
    bookingProducts: [],
    bookingMethod: 'lessgo_connect',
    gstin: first14 + gstinCheckChar(first14),
    city: 'Bengaluru',
    stateCode: 'KA',
    logoEmoji: '🌶️',
    brandColor: '#C0392B',
    plan: 'pilot',
    contactName: 'Anita Rao',
    contactEmail: 'anita@masalamagic.example',
    contactPhone: '98450 12345',
    handle: 'masalamagic',
    owner: { name: 'Anita Rao', email: 'anita@masalamagic.example', phone: '9845012345' },
    dispatch: { email: true },
    ...overrides,
  };
}

test('validates the onboarding form', () => {
  const ok = validateOnboarding(onboardingInput(), ['brewbros']);
  assert.equal(hasOnboardingErrors(ok), false);
  assert.deepEqual(ok.warnings, {});

  const bad = validateOnboarding(
    onboardingInput({
      brandName: 'M',
      gstin: '29AABCM1234K1ZX',
      contactPhone: '12345',
      handle: 'brewbros',
      brandColor: 'red',
      owner: { name: 'Anita Rao', email: 'anita@', phone: '12345' },
    }),
    ['brewbros'],
  );
  assert.deepEqual(Object.keys(bad.errors).sort(), [
    'brandColor',
    'brandName',
    'contactPhone',
    'gstin',
    'handle',
    'ownerEmail',
    'ownerPhone',
  ]);

  // The owner's mobile is optional contact info now that nothing is texted.
  const noPhone = validateOnboarding(onboardingInput({ owner: { name: 'Anita Rao', email: 'anita@masalamagic.example', phone: '' } }));
  assert.equal('ownerPhone' in noPhone.errors, false);

  const quiet = validateOnboarding(onboardingInput({ stateCode: 'MH', dispatch: { email: false } }));
  assert.equal(hasOnboardingErrors(quiet), false);
  assert.match(quiet.warnings.gstin, /different state/);
  assert.match(quiet.warnings.dispatch, /Nothing will be sent/);
});

test('decides the partner type from the category and checks online details', () => {
  assert.deepEqual(categoryDefaults('Shopping'), { channels: ['online_code'], bookingProducts: [] });
  assert.deepEqual(categoryDefaults('Tickets & events'), {
    channels: ['api_booking'],
    bookingProducts: ['movie_tickets', 'event_tickets'],
  });
  assert.deepEqual(categoryDefaults('Unknown'), { channels: ['in_store'], bookingProducts: [] });

  const shop = validateOnboarding(
    onboardingInput({ category: 'Shopping', channels: ['online_code'], website: 'https://stylecart.example' }),
  );
  assert.equal(hasOnboardingErrors(shop), false);
  assert.deepEqual(shop.warnings, {});

  const noSite = validateOnboarding(onboardingInput({ category: 'Shopping', channels: ['online_code'], website: 'http://x' }));
  assert.match(noSite.errors.website, /https website/);
  const none = validateOnboarding(onboardingInput({ channels: [] }));
  assert.match(none.errors.channels, /at least one/);
  const tickets = validateOnboarding(
    onboardingInput({ category: 'Tickets & events', channels: ['api_booking'], website: 'https://showspot.example' }),
  );
  assert.match(tickets.errors.bookingProducts, /what they sell/);
  const oddMix = validateOnboarding(
    onboardingInput({ category: 'Shopping', channels: ['in_store'], website: '' }),
  );
  assert.equal(hasOnboardingErrors(oddMix), false);
  assert.match(oddMix.warnings.channels, /usual setup for Shopping/);
});
