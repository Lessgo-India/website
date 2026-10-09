import test from 'node:test';
import assert from 'node:assert/strict';
import {
  contentSecurityPolicyFor,
  requiresNonceContentSecurityPolicy,
  sameContentSecurityPolicy,
} from './contentSecurityPolicy.ts';

const ASSET_BUCKET = 'https://lessgo-asset.s3.ap-south-1.amazonaws.com';
const ADMIN_PAGES = ['/admin', '/admin/reports', '/admin/bugs', '/admin/notifications', '/admin/settings'];
const ADMIN_PARTNER_PAGES = ['/admin/partners', '/admin/partners/new', '/admin/partners/ptr_brew_bros'];
const PORTAL_PAGES = ['/partner', '/partner/signup', '/partner/login', '/partner/dashboard', '/partner/campaigns/new', '/partner/redeem'];

/** directive → its sources, for one path. */
function directives(pathname, options = { nonce: 'bm9uY2U=', development: false }) {
  return new Map(
    contentSecurityPolicyFor(pathname, options)
      .split('; ')
      .map((directive) => {
        const [name, ...sources] = directive.split(' ');
        return [name, sources.join(' ')];
      }),
  );
}

test('nonce CSP is limited to the dynamic internal tools', () => {
  for (const pathname of [...ADMIN_PAGES, ...ADMIN_PARTNER_PAGES, ...PORTAL_PAGES]) {
    assert.equal(requiresNonceContentSecurityPolicy(pathname), true, pathname);
  }

  for (const pathname of ['/', '/design', '/features', '/administrator', '/partners']) {
    assert.equal(requiresNonceContentSecurityPolicy(pathname), false, pathname);
  }
});

test('Admin → Partners shows campaign creatives from any https host, like the partner portal', () => {
  for (const pathname of [...ADMIN_PARTNER_PAGES, ...PORTAL_PAGES]) {
    assert.equal(directives(pathname).get('img-src'), "'self' data: blob: https:", pathname);
  }
});

test('the rest of the admin console only loads images from the asset bucket', () => {
  for (const pathname of [...ADMIN_PAGES, '/admin/partners-archive', '/adminpartners']) {
    assert.equal(directives(pathname).get('img-src'), `'self' data: blob: ${ASSET_BUCKET}`, pathname);
  }
});

test('Admin → Partners relaxes only img-src: everything else matches the rest of the console', () => {
  const restOfConsole = directives('/admin/bugs');
  for (const pathname of ADMIN_PARTNER_PAGES) {
    const partners = directives(pathname);
    assert.deepEqual([...partners.keys()], [...restOfConsole.keys()]);
    for (const [name, sources] of partners) {
      if (name !== 'img-src') assert.equal(sources, restOfConsole.get(name), `${pathname} ${name}`);
    }
    assert.equal(partners.get('connect-src'), "'self'");
    assert.equal(partners.get('frame-src'), "'none'");
    assert.equal(partners.get('frame-ancestors'), "'none'");
    assert.equal(partners.get('object-src'), "'none'");
  }
});

test('only the partner portal frames OpenStreetMap; eval only in development', () => {
  const partner = directives('/partner/outlets');
  assert.equal(
    partner.get('frame-src'),
    'https://www.openstreetmap.org https://challenges.cloudflare.com',
  );
  assert.equal(
    partner.get('connect-src'),
    "'self' https://challenges.cloudflare.com",
  );
  assert.equal(
    directives('/admin', { nonce: 'abc', development: true }).get('script-src'),
    "'self' 'nonce-abc' 'unsafe-eval'",
  );
  assert.equal(
    directives('/partner', { nonce: 'abc', development: false }).get('script-src'),
    "'self' 'nonce-abc' https://challenges.cloudflare.com",
  );
});

test('links between pages with different policies must load a new document', () => {
  assert.equal(sameContentSecurityPolicy('/admin', '/admin/bugs'), true);
  assert.equal(sameContentSecurityPolicy('/admin/partners', '/admin/partners/ptr_brew_bros'), true);
  assert.equal(sameContentSecurityPolicy('/admin/partners/new', '/admin/partners'), true);
  assert.equal(sameContentSecurityPolicy('/admin', '/admin/partners'), false);
  assert.equal(sameContentSecurityPolicy('/admin/partners/ptr_brew_bros', '/admin/settings'), false);
});
