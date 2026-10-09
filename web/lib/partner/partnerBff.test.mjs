import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readBoundedJson } from '../boundedJsonBody.ts';
import {
  clearedPartnerSessionCookie,
  createPartnerBffHandlers,
  createPartnerGatewayCaller,
  PARTNER_BFF_MAX_BODY_BYTES,
  partnerGatewayHeaders,
  partnerPathSegments,
  partnerSessionCookie,
  partnerSessionMaxAge,
  resolvePartnerGatewayConfig,
} from './partnerBff.ts';

const NOW = 1_790_000_000_000;
const TOKEN = 'tok_9f8e7d6c5b4a39281706f5e4d3c2b1a0';
const SAME_ORIGIN = { origin: 'http://local', 'sec-fetch-site': 'same-origin' };
const JSON_HEADERS = { 'content-type': 'application/json', ...SAME_ORIGIN };
const SESSION = {
  token: '',
  user: { userId: 'stylecart.owner', partnerId: 'ptr_stylecart', name: 'Tanvi', email: 't@example.com', role: 'owner' },
  partner: { id: 'ptr_stylecart', brandName: 'StyleCart' },
  signedInAt: new Date(NOW).toISOString(),
  expiresAt: NOW + 8 * 60 * 60 * 1000,
};

const calls = [];
let gatewayReply = { status: 200, body: { ok: true } };
let enabled = true;
let secure = false;

const bff = createPartnerBffHandlers({
  enabled: () => enabled,
  callGateway: async (call) => {
    calls.push(call);
    return typeof gatewayReply === 'function' ? gatewayReply(call) : gatewayReply;
  },
  readJson: readBoundedJson,
  secureCookies: () => secure,
  now: () => NOW,
});

beforeEach(() => {
  calls.length = 0;
  gatewayReply = { status: 200, body: { ok: true } };
  enabled = true;
  secure = false;
});

const context = (...path) => ({ params: Promise.resolve({ path }) });

function post(url, body, headers = JSON_HEADERS) {
  return new Request(url, { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
}

/** Next hands route handlers an (empty) stream even when the browser sent no body. */
function emptyStream() {
  return new ReadableStream({ start: (controller) => controller.close() });
}

function withCookie(headers = {}, token = TOKEN) {
  return { ...headers, cookie: `theme=dark; lessgo_partner_session=${token}; other=1` };
}

// ── Configuration & gateway client ──────────────────────────────────────────

test('resolves the gateway URL in order, treating blank values as unset', () => {
  assert.deepEqual(
    resolvePartnerGatewayConfig({
      PARTNER_GATEWAY_URL: ' https://partners-gw.example/ ',
      ADMIN_GATEWAY_URL: 'https://admin-gw.example',
      PARTNER_GATEWAY_KEY: ' key ',
    }),
    { baseUrl: 'https://partners-gw.example', key: 'key' },
  );
  assert.equal(
    resolvePartnerGatewayConfig({ PARTNER_GATEWAY_URL: '', ADMIN_GATEWAY_URL: '  ', NEXT_PUBLIC_BACKEND_API: 'http://localhost:8090//' })
      .baseUrl,
    'http://localhost:8090',
  );
  assert.deepEqual(resolvePartnerGatewayConfig({}), { baseUrl: '', key: '' });
});

test('answers 503 not_configured without calling out when the URL or key is missing', async () => {
  let fetched = 0;
  const caller = createPartnerGatewayCaller({
    env: () => ({ NEXT_PUBLIC_BACKEND_API: 'http://localhost:8090' }),
    fetch: async () => {
      fetched += 1;
      return new Response('{}');
    },
    requestId: () => 'req-1',
  });
  const result = await caller({ method: 'GET', path: '/partner/team', search: '' });
  assert.equal(result.status, 503);
  assert.equal(result.body.code, 'not_configured');
  assert.equal(fetched, 0);
});

test('sends only the portal key, request id, session, idempotency key, client IP and content type', async () => {
  const seen = [];
  const caller = createPartnerGatewayCaller({
    env: () => ({ PARTNER_GATEWAY_URL: 'http://localhost:8090/', PARTNER_GATEWAY_KEY: 'portal-key' }),
    fetch: async (url, init) => {
      seen.push({ url, init });
      return new Response(JSON.stringify({ id: 'cmp_1' }), { status: 201, headers: { 'content-type': 'application/json' } });
    },
    requestId: () => 'req-42',
  });
  const result = await caller({
    method: 'POST',
    path: '/partner/campaigns',
    search: '?x=1',
    body: { draft: { headline: 'Hi' } },
    sessionToken: TOKEN,
    idempotencyKey: 'idem-1',
    clientIp: '198.51.100.4',
  });
  assert.deepEqual(result, { status: 201, body: { id: 'cmp_1' } });
  assert.equal(seen[0].url, 'http://localhost:8090/partner/campaigns?x=1');
  assert.deepEqual(seen[0].init.headers, {
    'x-partner-portal-key': 'portal-key',
    'x-request-id': 'req-42',
    'content-type': 'application/json',
    'x-partner-session': TOKEN,
    'idempotency-key': 'idem-1',
    'x-partner-client-ip': '198.51.100.4',
  });
  assert.equal(seen[0].init.body, JSON.stringify({ draft: { headline: 'Hi' } }));
  assert.equal(seen[0].init.cache, 'no-store');
  assert.equal(seen[0].init.redirect, 'manual');
  assert.deepEqual(partnerGatewayHeaders({ method: 'GET', path: '/partner/team', search: '' }, 'k', 'r'), {
    'x-partner-portal-key': 'k',
    'x-request-id': 'r',
  });
});

test('maps empty, non-JSON, redirected, slow and unreachable gateway responses', async () => {
  const make = (fetchImpl) =>
    createPartnerGatewayCaller({
      env: () => ({ PARTNER_GATEWAY_URL: 'http://gw', PARTNER_GATEWAY_KEY: 'k' }),
      fetch: fetchImpl,
      requestId: () => 'r',
    });
  const call = { method: 'POST', path: '/partner-auth/logout', search: '' };

  assert.deepEqual(await make(async () => new Response(null, { status: 204 }))(call), { status: 204, body: null });
  assert.deepEqual(await make(async () => new Response('<html>bad gateway</html>', { status: 502 }))(call), {
    status: 502,
    body: null,
  });
  const redirected = await make(async () => new Response(null, { status: 302, headers: { location: 'https://evil.example' } }))(call);
  assert.equal(redirected.status, 502);
  assert.equal(redirected.body.code, 'bad_response');
  const slow = await make(async () => {
    throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
  })(call);
  assert.equal(slow.status, 504);
  assert.equal(slow.body.code, 'gateway_timeout');
  const down = await make(async () => {
    throw new TypeError('fetch failed');
  })(call);
  assert.equal(down.status, 502);
  assert.equal(down.body.code, 'gateway_unreachable');
});

// ── Cookies & paths ─────────────────────────────────────────────────────────

test('caps the cookie lifetime at 8 hours and at the session expiry', () => {
  assert.equal(partnerSessionMaxAge(NOW + 9 * 60 * 60 * 1000, NOW), 8 * 60 * 60);
  assert.equal(partnerSessionMaxAge(NOW + 90_500, NOW), 90);
  assert.equal(partnerSessionMaxAge(NOW - 1, NOW), 0);
  assert.equal(partnerSessionMaxAge('soon', NOW), 8 * 60 * 60);
  assert.equal(
    partnerSessionCookie(TOKEN, 600, true),
    `lessgo_partner_session=${TOKEN}; Path=/; Max-Age=600; HttpOnly; SameSite=Lax; Secure`,
  );
  assert.equal(
    clearedPartnerSessionCookie(false),
    'lessgo_partner_session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax',
  );
});

test('accepts only plain, shallow catch-all paths', () => {
  assert.deepEqual(partnerPathSegments(['integrations', 'online_code', 'go-live']), ['integrations', 'online_code', 'go-live']);
  assert.deepEqual(partnerPathSegments(['campaigns', 'cmp_brew_bros_blr']), ['campaigns', 'cmp_brew_bros_blr']);
  assert.deepEqual(partnerPathSegments(['vouchers', 'vch:01']), ['vouchers', 'vch:01']);
  for (const bad of [
    [],
    [''],
    ['.'],
    ['..'],
    ['campaigns', '..', 'admin'],
    ['campaigns/1'],
    ['campaigns\\1'],
    ['campaigns%2F1'],
    ['campaigns', 'a b'],
    ['campaigns', 'é'],
    ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    ['campaigns', 'x'.repeat(129)],
    ['login'],
    ['session'],
    ['logout'],
    ['applications'],
    'campaigns',
  ]) {
    assert.equal(partnerPathSegments(bad), null, JSON.stringify(bad));
  }
});

test('public applications require same-origin JSON but no partner session', async () => {
  const application = {
    id: 'app_0123456789abcdef01234567',
    status: 'pending_review',
    brandName: 'Brew Bros',
  };
  gatewayReply = { status: 201, body: application };
  const response = await bff.applications(
    post(
      'http://local/api/partner/applications',
      { brandName: 'Brew Bros', captchaToken: 'captcha-token' },
      { ...JSON_HEADERS, 'x-real-ip': '192.0.2.44' },
    ),
  );
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), application);
  assert.deepEqual(calls, [
    {
      method: 'POST',
      path: '/partner-applications',
      search: '',
      body: { brandName: 'Brew Bros', captchaToken: 'captcha-token' },
      clientIp: '192.0.2.44',
    },
  ]);

  calls.length = 0;
  const crossOrigin = await bff.applications(
    post(
      'http://local/api/partner/applications',
      { brandName: 'Brew Bros', captchaToken: 'captcha-token' },
      { 'content-type': 'application/json', origin: 'https://attacker.example' },
    ),
  );
  assert.equal(crossOrigin.status, 403);
  assert.equal(calls.length, 0);
});

test('public application logos require one same-origin image and forward multipart data', async () => {
  gatewayReply = {
    status: 200,
    body: { url: 'https://assets.example/partner-logos/brew-bros.png' },
  };
  const form = new FormData();
  form.append('file', new Blob(['png'], { type: 'image/png' }), 'brew-bros.png');
  const response = await bff.applicationLogo(
    new Request('http://local/api/partner/applications/logo', {
      method: 'POST',
      headers: SAME_ORIGIN,
      body: form,
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), gatewayReply.body);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/partner-applications/logo');
  assert.equal(calls[0].formData.get('file').name, 'brew-bros.png');

  calls.length = 0;
  const invalid = new FormData();
  invalid.append('file', new Blob(['pdf'], { type: 'application/pdf' }), 'menu.pdf');
  const invalidResponse = await bff.applicationLogo(
    new Request('http://local/api/partner/applications/logo', {
      method: 'POST',
      headers: SAME_ORIGIN,
      body: invalid,
    }),
  );
  assert.equal(invalidResponse.status, 400);
  assert.equal(calls.length, 0);
});

// ── Sign-in ─────────────────────────────────────────────────────────────────

test('sign-in moves the token into an httpOnly cookie and never returns it', async () => {
  secure = true;
  gatewayReply = { status: 200, body: { kind: 'signed_in', session: { ...SESSION, token: 'leaked' }, token: TOKEN } };
  const response = await bff.login(
    post(
      'http://local/api/partner/login',
      { userId: 'stylecart.owner', password: 'Lessgo@2026' },
      { ...JSON_HEADERS, 'x-forwarded-for': '203.0.113.9, 198.51.100.4', authorization: 'Bearer nope', cookie: 'x=1' },
    ),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(response.headers.getSetCookie(), [
    `lessgo_partner_session=${TOKEN}; Path=/; Max-Age=28800; HttpOnly; SameSite=Lax; Secure`,
  ]);
  const body = await response.json();
  assert.equal(body.kind, 'signed_in');
  assert.equal('token' in body, false);
  assert.equal(body.session.token, '');
  assert.equal(JSON.stringify(body).includes(TOKEN), false);
  assert.deepEqual(calls, [
    {
      method: 'POST',
      path: '/partner-auth/login',
      search: '',
      body: { userId: 'stylecart.owner', password: 'Lessgo@2026' },
      clientIp: '198.51.100.4',
    },
  ]);
});

test('the sign-in cookie expires with the session', async () => {
  gatewayReply = {
    status: 200,
    body: { kind: 'signed_in', session: { ...SESSION, expiresAt: NOW + 30 * 60 * 1000 }, token: TOKEN },
  };
  const response = await bff.login(post('http://local/api/partner/login', { userId: 'a.owner', password: 'x' }));
  assert.match(response.headers.getSetCookie()[0], /; Max-Age=1800; /);
  assert.doesNotMatch(response.headers.getSetCookie()[0], /Secure/);
});

test('a temporary password passes the challenge through without a cookie', async () => {
  gatewayReply = {
    status: 200,
    body: { kind: 'password_change_required', challenge: 'chg_1', user: SESSION.user },
  };
  const response = await bff.login(post('http://local/api/partner/login', { userId: 'chaatstreet.owner', password: 'Welcome#4821' }));
  assert.equal(response.status, 200);
  assert.deepEqual(response.headers.getSetCookie(), []);
  assert.deepEqual(await response.json(), gatewayReply.body);
});

test('sign-in errors pass through with their code; malformed successes are refused', async () => {
  gatewayReply = { status: 429, body: { statusCode: 429, message: 'Too many attempts. Try again in a minute.', code: 'locked' } };
  const locked = await bff.login(post('http://local/api/partner/login', { userId: 'a.owner', password: 'x' }));
  assert.equal(locked.status, 429);
  assert.deepEqual(await locked.json(), gatewayReply.body);
  assert.deepEqual(locked.headers.getSetCookie(), []);

  for (const body of [
    { kind: 'signed_in', session: SESSION },
    { kind: 'signed_in', session: SESSION, token: 'short' },
    { kind: 'signed_in', session: SESSION, token: `${TOKEN}; Domain=evil.example` },
    { kind: 'signed_in', session: { ...SESSION, expiresAt: NOW - 1 }, token: TOKEN },
    { kind: 'something_else' },
    ['signed_in'],
  ]) {
    gatewayReply = { status: 200, body };
    const response = await bff.login(post('http://local/api/partner/login', { userId: 'a.owner', password: 'x' }));
    assert.equal(response.status, 502, JSON.stringify(body));
    assert.equal((await response.json()).code, 'bad_response');
    assert.deepEqual(response.headers.getSetCookie(), []);
  }
});

test('sign-in refuses cross-origin, non-JSON, oversized and non-object bodies before calling out', async () => {
  const crossOrigin = await bff.login(
    post('http://local/api/partner/login', { userId: 'a.owner', password: 'x' }, {
      'content-type': 'application/json',
      origin: 'https://attacker.example',
    }),
  );
  assert.equal(crossOrigin.status, 403);

  const form = await bff.login(
    post('http://local/api/partner/login', 'userId=a.owner&password=x', {
      ...SAME_ORIGIN,
      'content-type': 'application/x-www-form-urlencoded',
    }),
  );
  assert.equal(form.status, 415);

  const empty = await bff.login(
    new Request('http://local/api/partner/login', { method: 'POST', headers: SAME_ORIGIN, body: emptyStream(), duplex: 'half' }),
  );
  assert.equal(empty.status, 400);

  const declared = await bff.login(
    post('http://local/api/partner/login', '{}', { ...JSON_HEADERS, 'content-length': String(PARTNER_BFF_MAX_BODY_BYTES + 1) }),
  );
  assert.equal(declared.status, 413);

  const streamed = await bff.login(
    post('http://local/api/partner/login', { userId: 'a.owner', password: 'x'.repeat(PARTNER_BFF_MAX_BODY_BYTES) }),
  );
  assert.equal(streamed.status, 413);

  const list = await bff.login(post('http://local/api/partner/login', ['a.owner', 'x']));
  assert.equal(list.status, 400);
  const broken = await bff.login(post('http://local/api/partner/login', '{"userId":'));
  assert.equal(broken.status, 400);
  assert.equal(calls.length, 0);
});

test('first-password sets the cookie and returns only { session }', async () => {
  gatewayReply = { status: 200, body: { session: SESSION, token: TOKEN } };
  const response = await bff.firstPassword(
    post('http://local/api/partner/login/first-password', { challenge: 'chg_1', newPassword: 'NewPassword2026' }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { session: SESSION });
  assert.match(response.headers.getSetCookie()[0], new RegExp(`^lessgo_partner_session=${TOKEN}; Path=/; Max-Age=28800; HttpOnly; SameSite=Lax$`));
  assert.equal(calls[0].path, '/partner-auth/first-password');

  gatewayReply = { status: 401, body: { message: 'This sign-in expired.', code: 'challenge_expired' } };
  const expired = await bff.firstPassword(
    post('http://local/api/partner/login/first-password', { challenge: 'chg_1', newPassword: 'NewPassword2026' }),
  );
  assert.equal(expired.status, 401);
  assert.equal((await expired.json()).code, 'challenge_expired');
});

// ── Session & sign-out ──────────────────────────────────────────────────────

test('the session check needs the cookie and clears it when the gateway says 401', async () => {
  const anonymous = await bff.session(new Request('http://local/api/partner/session'));
  assert.equal(anonymous.status, 401);
  assert.deepEqual(anonymous.headers.getSetCookie(), []);
  assert.equal(calls.length, 0);

  const malformed = await bff.session(new Request('http://local/api/partner/session', { headers: withCookie({}, 'bad;value') }));
  assert.equal(malformed.status, 401);
  assert.match(malformed.headers.getSetCookie()[0], /^lessgo_partner_session=; Path=\/; Max-Age=0/);
  assert.equal(calls.length, 0);

  gatewayReply = { status: 200, body: { session: { ...SESSION, token: 'leaked' } } };
  const signedIn = await bff.session(new Request('http://local/api/partner/session', { headers: withCookie() }));
  assert.equal(signedIn.status, 200);
  assert.deepEqual(await signedIn.json(), { session: SESSION });
  assert.deepEqual(calls[0], { method: 'GET', path: '/partner-auth/session', search: '', sessionToken: TOKEN, clientIp: undefined });

  gatewayReply = { status: 401, body: { message: 'Session revoked.', code: 'unauthenticated' } };
  const revoked = await bff.session(new Request('http://local/api/partner/session', { headers: withCookie() }));
  assert.equal(revoked.status, 401);
  assert.deepEqual(await revoked.json(), gatewayReply.body);
  assert.match(revoked.headers.getSetCookie()[0], /^lessgo_partner_session=; .*Max-Age=0/);
});

test('sign-out always clears the cookie, even when the gateway is down', async () => {
  gatewayReply = { status: 502, body: { message: 'Gateway unreachable.', code: 'gateway_unreachable' } };
  const response = await bff.logout(new Request('http://local/api/partner/logout', { method: 'POST', headers: withCookie(SAME_ORIGIN) }));
  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
  assert.match(response.headers.getSetCookie()[0], /^lessgo_partner_session=; .*Max-Age=0/);
  assert.deepEqual(calls[0], { method: 'POST', path: '/partner-auth/logout', search: '', sessionToken: TOKEN, clientIp: undefined });

  const anonymous = await bff.logout(new Request('http://local/api/partner/logout', { method: 'POST', headers: SAME_ORIGIN }));
  assert.equal(anonymous.status, 204);
  assert.equal(calls.length, 1);

  const crossSite = await bff.logout(
    new Request('http://local/api/partner/logout', {
      method: 'POST',
      headers: withCookie({ origin: 'https://attacker.example', 'sec-fetch-site': 'cross-site' }),
    }),
  );
  assert.equal(crossSite.status, 403);
  assert.deepEqual(crossSite.headers.getSetCookie(), []);
  assert.equal(calls.length, 1);
});

// ── Catch-all ───────────────────────────────────────────────────────────────

test('forwards reads with the query string, session and client IP only', async () => {
  gatewayReply = { status: 200, body: { campaigns: [] } };
  const response = await bff.GET(
    new Request('http://local/api/partner/overview?days=30', {
      headers: withCookie({ 'x-real-ip': '192.0.2.3', authorization: 'Bearer x', 'x-partner-portal-key': 'spoofed' }),
    }),
    context('overview'),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(calls[0], {
    method: 'GET',
    path: '/partner/overview',
    search: '?days=30',
    sessionToken: TOKEN,
    clientIp: '192.0.2.3',
  });
});

test('refuses unsafe paths, long queries and missing sessions without calling out', async () => {
  const cases = [
    ['http://local/api/partner/campaigns/..%2Fadmin', ['campaigns', '../admin']],
    ['http://local/api/partner/campaigns%2F1', ['campaigns/1']],
    ['http://local/api/partner/campaigns%5C1', ['campaigns', '1']],
    ['http://local/api/partner/./x', ['.', 'x']],
    ['http://local/api/partner/session', ['session']],
    ['http://local/api/partner/login/first-password', ['login', 'first-password']],
  ];
  for (const [url, path] of cases) {
    const response = await bff.GET(new Request(url, { headers: withCookie() }), context(...path));
    assert.equal(response.status, 404, url);
  }
  const long = await bff.GET(
    new Request(`http://local/api/partner/redemptions?campaignId=${'x'.repeat(2_100)}`, { headers: withCookie() }),
    context('redemptions'),
  );
  assert.equal(long.status, 414);
  const anonymous = await bff.GET(new Request('http://local/api/partner/team'), context('team'));
  assert.equal(anonymous.status, 401);
  assert.equal((await anonymous.json()).code, 'unauthenticated');
  assert.equal(calls.length, 0);
});

test('mutations must be same-origin JSON with a well-formed idempotency key', async () => {
  const crossOrigin = await bff.POST(
    post('http://local/api/partner/campaigns', { draft: {} }, withCookie({ 'content-type': 'application/json', origin: 'https://attacker.example' })),
    context('campaigns'),
  );
  assert.equal(crossOrigin.status, 403);

  const badKey = await bff.POST(
    post('http://local/api/partner/campaigns', { draft: {} }, withCookie({ ...JSON_HEADERS, 'idempotency-key': 'not valid!' })),
    context('campaigns'),
  );
  assert.equal(badKey.status, 400);

  const form = await bff.PUT(
    post('http://local/api/partner/integrations/checkout', 'allowedDomains=x', withCookie({ ...SAME_ORIGIN, 'content-type': 'text/plain' })),
    context('integrations', 'checkout'),
  );
  assert.equal(form.status, 415);

  const huge = await bff.PATCH(
    new Request('http://local/api/partner/outlets/out_1', {
      method: 'PATCH',
      headers: withCookie(JSON_HEADERS),
      body: JSON.stringify({ status: 'paused', note: 'x'.repeat(PARTNER_BFF_MAX_BODY_BYTES) }),
    }),
    context('outlets', 'out_1'),
  );
  assert.equal(huge.status, 413);
  assert.equal(calls.length, 0);

  gatewayReply = { status: 201, body: { id: 'cmp_new', status: 'in_review' } };
  const key = '0b9f7d1e-6a52-4c1f-9d4e-2f6c1a7b8e90';
  const created = await bff.POST(
    post('http://local/api/partner/campaigns', { draft: { headline: 'Hi' } }, withCookie({ ...JSON_HEADERS, 'idempotency-key': key })),
    context('campaigns'),
  );
  assert.equal(created.status, 201);
  assert.deepEqual(await created.json(), gatewayReply.body);
  assert.deepEqual(calls[0], {
    method: 'POST',
    path: '/partner/campaigns',
    search: '',
    body: { draft: { headline: 'Hi' } },
    sessionToken: TOKEN,
    idempotencyKey: key,
    clientIp: undefined,
  });
});

test('bodiless actions forward without a body, even when Next supplies an empty stream', async () => {
  gatewayReply = { status: 200, body: { ok: true, environment: 'sandbox', steps: [] } };
  const response = await bff.POST(
    new Request('http://local/api/partner/integrations/online_code/test', {
      method: 'POST',
      headers: withCookie(SAME_ORIGIN),
      body: emptyStream(),
      duplex: 'half',
    }),
    context('integrations', 'online_code', 'test'),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(calls[0], {
    method: 'POST',
    path: '/partner/integrations/online_code/test',
    search: '',
    sessionToken: TOKEN,
    clientIp: undefined,
  });
});

test('passes upstream errors, validation details and 204s through; a 401 clears the cookie', async () => {
  const details = { offer: ['Pick a discount.'], audience: ['Widen the audience.'] };
  gatewayReply = { status: 422, body: { statusCode: 422, message: 'Fix the highlighted steps.', code: 'validation', details } };
  const invalid = await bff.POST(post('http://local/api/partner/campaigns', { draft: {} }, withCookie(JSON_HEADERS)), context('campaigns'));
  assert.equal(invalid.status, 422);
  assert.deepEqual(await invalid.json(), gatewayReply.body);
  assert.deepEqual(invalid.headers.getSetCookie(), []);

  gatewayReply = { status: 204, body: null };
  const changed = await bff.POST(
    post('http://local/api/partner/password', { currentPassword: 'a', newPassword: 'b' }, withCookie(JSON_HEADERS)),
    context('password'),
  );
  assert.equal(changed.status, 204);
  assert.equal(await changed.text(), '');

  gatewayReply = { status: 401, body: { message: 'Session revoked.', code: 'unauthenticated' } };
  const revoked = await bff.GET(new Request('http://local/api/partner/team', { headers: withCookie() }), context('team'));
  assert.equal(revoked.status, 401);
  assert.match(revoked.headers.getSetCookie()[0], /^lessgo_partner_session=; .*Max-Age=0/);

  gatewayReply = { status: 500, body: null };
  const failed = await bff.GET(new Request('http://local/api/partner/team', { headers: withCookie() }), context('team'));
  assert.equal(failed.status, 500);
  assert.equal((await failed.json()).code, 'bad_response');

  gatewayReply = { status: 200, body: null };
  const empty = await bff.GET(new Request('http://local/api/partner/team', { headers: withCookie() }), context('team'));
  assert.equal(empty.status, 502);
});

test('every route is a 404 while the portal is disabled', async () => {
  enabled = false;
  const responses = await Promise.all([
    bff.login(post('http://local/api/partner/login', { userId: 'a.owner', password: 'x' })),
    bff.firstPassword(post('http://local/api/partner/login/first-password', { challenge: 'c', newPassword: 'p' })),
    bff.session(new Request('http://local/api/partner/session', { headers: withCookie() })),
    bff.logout(new Request('http://local/api/partner/logout', { method: 'POST', headers: withCookie(SAME_ORIGIN) })),
    bff.GET(new Request('http://local/api/partner/team', { headers: withCookie() }), context('team')),
    bff.DELETE(new Request('http://local/api/partner/team', { method: 'DELETE', headers: withCookie(SAME_ORIGIN) }), context('team')),
  ]);
  assert.deepEqual(
    responses.map((response) => response.status),
    [404, 404, 404, 404, 404, 404],
  );
  assert.equal(calls.length, 0);
});
