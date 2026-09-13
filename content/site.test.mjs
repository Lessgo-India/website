import assert from 'node:assert/strict';
import test from 'node:test';

import { footer } from './site.ts';

const PUBLIC_PAGE_PATHS = [
  '/',
  '/features',
  '/download',
  '/help',
  '/delete-account',
  '/whats-new',
  '/privacy',
  '/terms',
];

const footerHrefs = footer.columns.flatMap((column) =>
  column.links.map((link) => link.href),
);

test('footer links to every public site page', () => {
  for (const path of PUBLIC_PAGE_PATHS) {
    assert.ok(footerHrefs.includes(path), `Missing public footer link: ${path}`);
  }
});

test('footer never exposes admin routes', () => {
  assert.equal(
    footerHrefs.some((href) => href === '/admin' || href.startsWith('/admin/')),
    false,
  );
});