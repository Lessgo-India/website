import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCheckoutLink,
  channelIsLive,
  funnelSteps,
  isAllowedPartnerUrl,
  normaliseDomain,
  partnerAllowedDomains,
  redeemedNoun,
  salesLabel,
} from './channels.ts';

test('normalises partner domains and rejects anything else', () => {
  assert.equal(normaliseDomain('StyleCart.example'), 'stylecart.example');
  assert.equal(normaliseDomain('https://m.StyleCart.example/cart?x=1'), 'm.stylecart.example');
  assert.equal(normaliseDomain('stylecart.example.'), 'stylecart.example');
  for (const bad of ['', 'localhost', 'stylecart.example/cart', 'user@stylecart.example', 'https://a:b@stylecart.example', '-bad.example', 'https://stylecart.example:8443', 'https://stylecart.example\\@evil.example', 'style cart.example']) {
    assert.equal(normaliseDomain(bad), null, bad);
  }
});

test('only opens https links on the partner’s domains', () => {
  const domains = ['stylecart.example'];
  assert.equal(isAllowedPartnerUrl('https://stylecart.example/lessgo', domains), true);
  assert.equal(isAllowedPartnerUrl('https://m.stylecart.example/cart', domains), true);
  for (const bad of [
    'http://stylecart.example/lessgo',
    'https://stylecart.example.evil.example/x',
    'https://evilstylecart.example/x',
    'https://user:pass@stylecart.example/x',
    'https://stylecart.example:444/x',
    'javascript:alert(1)',
    'not a url',
    // new URL() "fixes" these; other parsers read them differently.
    'https://stylecart.example\\@evil.example/x',
    'https://stylecart.example\\.evil.example/x',
    'https://style\ncart.example/x',
    'https://stylecart.example/\tx',
    'https://@stylecart.example/x',
  ]) {
    assert.equal(isAllowedPartnerUrl(bad, domains), false, bad);
  }
});

test('builds the checkout link with the code URL-encoded', () => {
  const domains = ['stylecart.example'];
  const online = { landingUrl: 'https://stylecart.example/lessgo', applyUrlTemplate: 'https://stylecart.example/cart?coupon={code}&src={code}' };
  assert.equal(
    buildCheckoutLink(online, 'STC-7KQ4 M2XD&x', domains),
    'https://stylecart.example/cart?coupon=STC-7KQ4%20M2XD%26x&src=STC-7KQ4%20M2XD%26x',
  );
  assert.equal(buildCheckoutLink({ landingUrl: 'https://stylecart.example/lessgo' }, 'X', domains), 'https://stylecart.example/lessgo');
  assert.equal(buildCheckoutLink({ landingUrl: 'https://evil.example/' }, 'X', domains), null);
  // A template without {code} falls back to the landing page.
  assert.equal(
    buildCheckoutLink({ landingUrl: 'https://stylecart.example/lessgo', applyUrlTemplate: 'https://stylecart.example/cart' }, 'X', domains),
    'https://stylecart.example/lessgo',
  );
});

test('derives allowed domains, go-live and labels from the partner’s channels', () => {
  const partner = {
    channels: ['online_code', 'api_booking'],
    website: 'https://StyleCart.example/',
    integration: {
      apiKeyPreview: 'x',
      checkout: { status: 'live', allowedDomains: ['m.stylecart.example', 'bad domain'], sandboxKeyPreview: 'x' },
      booking: { status: 'ready_for_review', method: 'lessgo_connect', products: ['hotels'], auth: 'api_key' },
    },
  };
  assert.deepEqual(partnerAllowedDomains(partner), ['stylecart.example', 'm.stylecart.example']);
  assert.equal(channelIsLive(partner, 'online_code'), true);
  assert.equal(channelIsLive(partner, 'api_booking'), false);
  assert.equal(channelIsLive(partner, 'in_store'), false);
  assert.equal(channelIsLive({ channels: ['in_store'], integration: { apiKeyPreview: 'x' } }, 'in_store'), true);

  assert.equal(salesLabel(['in_store']), null);
  assert.equal(salesLabel(['in_store', 'online_code']), 'Orders');
  assert.equal(salesLabel(['api_booking']), 'Bookings');
  assert.equal(salesLabel(['online_code', 'api_booking']), 'Orders & bookings');
  assert.equal(redeemedNoun('api_booking', 2), 'bookings');
  assert.equal(funnelSteps('online_code').at(-1).label, 'Ordered with the code');
  assert.equal(funnelSteps('api_booking').at(-2).key, 'checkouts');
  assert.equal(funnelSteps('in_store').some((step) => step.key === 'checkouts'), false);
});
