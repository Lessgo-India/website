import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVoucherCode,
  can,
  computeDiscount,
  estimateAudience,
  hasDraftErrors,
  isRotatingCode,
  isWellFormedVoucherCode,
  maskVoucherCode,
  newPasswordProblem,
  normaliseTargeting,
  normaliseVoucherCode,
  offerLabel,
  parseRedemptionInput,
  roundEstimate,
  rupeesToMinor,
  safeNextPath,
  validateCampaignDraft,
  validateTargeting,
} from './rules.ts';

// Minted by the app's generateVoucherCode (lessgo-react-native/utils/voucherCode.ts).
const APP_CODES = ['BRB-0GQ8-C6ZG-Y', 'SLC-G83T-WE77-T'];

test('accepts codes minted by the app and rejects single-character typos', () => {
  for (const code of APP_CODES) assert.equal(isWellFormedVoucherCode(code), true, code);
  assert.equal(isWellFormedVoucherCode('BRB-0GQ8-C6ZG-X'), false);
  assert.equal(isWellFormedVoucherCode('BRB-0GQ9-C6ZG-Y'), false);
  assert.equal(isWellFormedVoucherCode(buildVoucherCode('CHS', '7KQ4M2XD')), true);
});

test('masks everything after the first block', () => {
  assert.equal(maskVoucherCode('BRB-0GQ8-C6ZG-Y'), 'BRB-0GQ8-••••-•');
});

test('normalises sloppy code entry', () => {
  assert.equal(normaliseVoucherCode(' brb 0gq8 c6zg y '), 'BRB-0GQ8-C6ZG-Y');
  assert.equal(normaliseVoucherCode('BRBOGQ8C6ZGY'), 'BRB-0GQ8-C6ZG-Y');
  assert.equal(normaliseVoucherCode('slc-g83t-we77-t'), 'SLC-G83T-WE77-T');
});

test('parses scanner input, typed codes and junk', () => {
  assert.deepEqual(parseRedemptionInput('LGV1:vch_m1abc_9xz:048213'), {
    kind: 'qr',
    voucherId: 'vch_m1abc_9xz',
    rotatingCode: '048213',
  });
  assert.deepEqual(parseRedemptionInput('brb-0gq8-c6zg-y'), { kind: 'code', code: 'BRB-0GQ8-C6ZG-Y' });
  assert.equal(parseRedemptionInput('LGV0:abc:1').kind, 'invalid');
  assert.match(parseRedemptionInput('BRB-0GQ8-C6ZG-X').reason, /typo/);
  assert.match(parseRedemptionInput('hello').reason, /Codes look like/);
  assert.equal(parseRedemptionInput('   ').kind, 'invalid');
  assert.equal(isRotatingCode('048 213'), true);
  assert.equal(isRotatingCode('04821'), false);
});

test('parses rupee amounts into paise', () => {
  assert.equal(rupeesToMinor('1,250.50'), 125050);
  assert.equal(rupeesToMinor('₹ 999'), 99900);
  assert.equal(rupeesToMinor('0'), null);
  assert.equal(rupeesToMinor('12.345'), null);
  assert.equal(rupeesToMinor('abc'), null);
});

test('labels offers the way the tray shows them', () => {
  assert.equal(offerLabel({ type: 'flat', valueMinor: 20000, minGroupSize: 3 }), '₹200 OFF');
  assert.equal(offerLabel({ type: 'percent', percentBp: 2500, minGroupSize: 3 }), '25% OFF');
  assert.equal(offerLabel({ type: 'bogo', minGroupSize: 2 }), 'BUY 1 GET 1');
  assert.equal(offerLabel({ type: 'freebie', freebieItem: 'Dessert', minGroupSize: 5 }), 'FREE DESSERT');
});

test('computes counter discounts', () => {
  const flat = { type: 'flat', valueMinor: 20000, minBillMinor: 99900, minGroupSize: 3, label: '₹200 OFF' };
  assert.equal(computeDiscount(flat, 50000).eligible, false);
  assert.match(computeDiscount(flat, 50000).note, /at least ₹999/);
  assert.deepEqual(computeDiscount(flat, 150000), {
    eligible: true,
    discountMinor: 20000,
    payableMinor: 130000,
    note: undefined,
  });

  const smallFlat = { type: 'flat', valueMinor: 40000, minGroupSize: 4, label: '₹400 OFF' };
  assert.equal(computeDiscount(smallFlat, 25000).discountMinor, 25000);

  const percent = { type: 'percent', percentBp: 2500, maxDiscountMinor: 30000, minGroupSize: 3, label: '25% OFF' };
  assert.equal(computeDiscount(percent, 80000).discountMinor, 20000);
  assert.equal(computeDiscount(percent, 400000).discountMinor, 30000);

  const freebie = { type: 'freebie', freebieItem: 'Dessert platter', minGroupSize: 5, label: 'FREE' };
  const quote = computeDiscount(freebie, 240000);
  assert.equal(quote.discountMinor, 0);
  assert.equal(quote.payableMinor, 240000);
  assert.match(quote.note, /Dessert platter/);

  assert.equal(computeDiscount(flat, 0).eligible, false);
});

test('normalises targeting so "no rule" is undefined', () => {
  assert.deepEqual(normaliseTargeting({ ageBrackets: [], gender: 'all', geo: { include: { states: [] } } }), {});
  assert.deepEqual(
    normaliseTargeting({ ageBrackets: ['18-24', '25-34', '35-44', '45-54', '55+'] }),
    {},
  );
  assert.deepEqual(
    normaliseTargeting({
      ageBrackets: ['25-34', '18-24'],
      gender: 'F',
      geo: { include: { states: ['KA', 'KA'] }, exclude: { districts: ['KA-bengaluru-urban'] } },
    }),
    {
      ageBrackets: ['18-24', '25-34'],
      gender: 'F',
      geo: {
        include: { states: ['KA'], districts: undefined },
        exclude: { states: undefined, districts: ['KA-bengaluru-urban'] },
      },
    },
  );
});

test('flags contradictory and no-op geo rules', () => {
  const levels = (targeting) => validateTargeting(targeting).map((issue) => issue.level);

  assert.deepEqual(levels({ geo: { include: { states: ['KA'] }, exclude: { districts: ['KA-bengaluru-urban'] } } }), []);
  assert.deepEqual(levels({ geo: { exclude: { districts: ['DL-shahdara'] } } }), []);
  assert.deepEqual(
    levels({ geo: { include: { districts: ['KA-mysuru'] }, exclude: { districts: ['KA-mysuru'] } } }),
    ['error'],
  );
  assert.deepEqual(levels({ geo: { include: { states: ['KA'] }, exclude: { states: ['KA'] } } }), ['error']);
  assert.deepEqual(
    levels({ geo: { include: { districts: ['MH-pune'] }, exclude: { states: ['MH'] } } }),
    ['error'],
  );
  assert.deepEqual(
    levels({ geo: { include: { states: ['KA'] }, exclude: { districts: ['TN-chennai'] } } }),
    ['warning'],
  );
  assert.deepEqual(
    levels({ geo: { include: { states: ['KA'], districts: ['KA-mysuru'] } } }),
    ['warning'],
  );
});

test('estimates audience size from a model', () => {
  const model = {
    usersByState: { AA: 1000, BB: 500 },
    districtsByState: { AA: ['AA-x', 'AA-y', 'AA-z'], BB: ['BB-p', 'BB-q'] },
    districtWeight: { 'AA-x': 0.5 },
  };
  assert.equal(estimateAudience({}, model), 1500);
  assert.equal(estimateAudience({ geo: { include: { states: ['AA'] } } }, model), 1000);
  assert.equal(
    estimateAudience({ geo: { include: { states: ['AA'] }, exclude: { districts: ['AA-x'] } } }, model),
    500,
  );
  assert.equal(estimateAudience({ geo: { include: { districts: ['AA-y', 'BB-p'] } } }, model), 500);
  assert.equal(estimateAudience({ geo: { exclude: { states: ['BB'] } } }, model), 1000);
  assert.equal(estimateAudience({ ageBrackets: ['18-24'] }, model), 510);
  assert.equal(estimateAudience({ gender: 'F' }, model), 660);
  assert.equal(estimateAudience({ geo: { include: { districts: ['ZZ-nowhere'] } } }, model), 0);
});

test('rounds estimates to two significant figures', () => {
  assert.equal(roundEstimate(123456), 120000);
  assert.equal(roundEstimate(987), 990);
  assert.equal(roundEstimate(5), 5);
  assert.equal(roundEstimate(0), 0);
});

function validDraft(overrides = {}) {
  const now = Date.parse('2026-06-01T10:00:00Z');
  return {
    now,
    draft: {
      headline: '₹150 off weekday coffee',
      description: 'Bring the team.',
      terms: ['Valid Monday to Friday.'],
      storyImageUrl: 'https://images.unsplash.com/photo-1?w=1080',
      coverImageUrl: 'https://images.unsplash.com/photo-1?w=1280',
      offer: { type: 'flat', valueMinor: 15000, minBillMinor: 60000, minGroupSize: 3 },
      voucherPolicy: { codePrefix: 'BRB', validityDays: 14, redemptionLimit: 500, dailyLimit: 50, perUserLimit: 1 },
      targeting: { geo: { include: { districts: ['KA-bengaluru-urban'] } } },
      outletIds: [],
      startAt: '2026-06-02T00:00:00.000Z',
      endAt: '2026-07-02T00:00:00.000Z',
      eventType: 'COFFEE',
      eventName: 'Coffee at Brew Bros',
      ...overrides,
    },
  };
}

test('validates campaign drafts step by step', () => {
  const ok = validDraft();
  assert.equal(hasDraftErrors(validateCampaignDraft(ok.draft, { now: ok.now })), false);

  const bad = validDraft({
    headline: 'Hi',
    offer: { type: 'flat', valueMinor: 70000, minBillMinor: 60000, minGroupSize: 1 },
    storyImageUrl: 'http://insecure.example/x.jpg',
    voucherPolicy: { codePrefix: 'brb1', validityDays: 0, redemptionLimit: 10, dailyLimit: 20, perUserLimit: 1 },
    targeting: { geo: { include: { states: ['KA'] }, exclude: { states: ['KA'] } } },
    endAt: '2026-06-01T00:00:00.000Z',
  });
  const errors = validateCampaignDraft(bad.draft, { now: bad.now, nameOf: (id) => `<${id}>` });
  assert.equal(errors.offer.length, 3);
  assert.deepEqual(errors.creative, ['Add a story creative (https image URL).']);
  assert.deepEqual(errors.audience, ['<KA> is both included and excluded.']);
  assert.equal(errors.rules.length, 4);

  const percent = validDraft({ offer: { type: 'percent', percentBp: 2500, minGroupSize: 3 } });
  assert.deepEqual(validateCampaignDraft(percent.draft, { now: percent.now }).offer, [
    'Percentage offers need a maximum discount.',
  ]);

  const blankNumbers = validDraft({
    voucherPolicy: { codePrefix: 'BRB', validityDays: NaN, redemptionLimit: NaN, dailyLimit: null, perUserLimit: NaN },
  });
  assert.equal(validateCampaignDraft(blankNumbers.draft, { now: blankNumbers.now }).rules.length, 3);
});

test('scopes roles and only honours same-portal redirects', () => {
  assert.equal(can('owner', 'integrations'), true);
  assert.equal(can('manager', 'integrations'), false);
  assert.equal(can('cashier', 'campaigns'), false);
  assert.equal(can('cashier', 'redeem'), true);

  assert.equal(safeNextPath('/partner/campaigns/cmp_1', 'owner'), '/partner/campaigns/cmp_1');
  assert.equal(safeNextPath('https://evil.example', 'owner'), '/partner');
  assert.equal(safeNextPath('//evil.example', 'owner'), '/partner');
  assert.equal(safeNextPath('/partner/login', 'owner'), '/partner');
  assert.equal(safeNextPath('/partnerx', 'owner'), '/partner');
  assert.equal(safeNextPath(null, 'cashier'), '/partner/redeem');
});

test('enforces the partner password policy', () => {
  assert.equal(newPasswordProblem('short1', { userId: 'slice.owner' }), 'Use at least 10 characters.');
  assert.equal(newPasswordProblem('onlyletters', { userId: 'slice.owner' }), 'Mix letters and numbers.');
  assert.equal(newPasswordProblem('Chaatstreet2026', { userId: 'chaatstreet.owner' }), 'Don’t include your user ID.');
  assert.match(newPasswordProblem('Welcome#4821x', { userId: 'chaatstreet.owner', previous: 'Welcome#4821x' }), /haven’t used/);
  assert.equal(newPasswordProblem('Monsoon-Chai-42', { userId: 'chaatstreet.owner', previous: 'Welcome#4821' }), null);
});
