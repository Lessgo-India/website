import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { changelog, faq, features, footer, hero, nav } from './site.ts';
import { isInternalToolPath } from '../web/lib/internalRoutes.ts';

const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../app');
const footerExcludedPaths = new Set(['/me', '/onboarding']);
const redirectedPagePaths = new Set(['/privacy']);

function collectPageFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectPageFiles(path);
    return /^page\.(?:[jt]sx?)$/.test(entry.name) ? [path] : [];
  });
}

function staticPublicPath(pageFile) {
  const segments = relative(appDirectory, dirname(pageFile))
    .split(sep)
    .filter((segment) => segment && !segment.startsWith('('));

  if (segments.some((segment) => segment.includes('['))) {
    return null;
  }

  const path = segments.length > 0 ? `/${segments.join('/')}` : '/';
  // The admin console and partner portal are internal tools, not site pages.
  if (isInternalToolPath(path)) return null;
  return footerExcludedPaths.has(path) || redirectedPagePaths.has(path) ? null : path;
}

const publicPagePaths = collectPageFiles(appDirectory)
  .map(staticPublicPath)
  .filter((path) => path !== null);

const footerHrefs = footer.columns.flatMap((column) =>
  column.links.map((link) => link.href),
);

test('footer links to every public static site page', () => {
  for (const path of publicPagePaths) {
    assert.ok(footerHrefs.includes(path), `Missing public footer link: ${path}`);
  }
});

test('footer omits authenticated utility pages', () => {
  for (const path of footerExcludedPaths) {
    assert.equal(footerHrefs.includes(path), false, `Unexpected footer link: ${path}`);
  }
});

test('footer never exposes admin routes', () => {
  assert.equal(
    footerHrefs.some((href) => href === '/admin' || href.startsWith('/admin/')),
    false,
  );
});

test('footer never exposes the partner portal', () => {
  assert.equal(
    footerHrefs.some((href) => href === '/partner' || href.startsWith('/partner/')),
    false,
  );
});

test('How it works navigation opens the Events section', () => {
  const howItWorksLinks = [
    ...nav.primary,
    ...footer.columns.flatMap((column) => column.links),
  ].filter((link) => link.label === 'How it works');

  assert.ok(howItWorksLinks.length > 0);
  assert.deepEqual(new Set(howItWorksLinks.map((link) => link.href)), new Set(['/#events']));
});

test('privacy navigation opens the standalone policy page', () => {
  const privacyLinks = footer.columns
    .flatMap((column) => column.links)
    .filter((link) => link.label === 'Privacy Policy' || link.label === 'Privacy at Lessgo');

  assert.ok(privacyLinks.length > 0);
  assert.deepEqual(new Set(privacyLinks.map((link) => link.href)), new Set(['/policy']));
});

test('payment copy uses Payment Address instead of UPI', () => {
  const paymentContent = JSON.stringify({ features, faq, changelog });

  assert.doesNotMatch(paymentContent, /\bUPI\b/i);
  assert.match(paymentContent, /Payment Address/);
});

test('hero trust points omit Made in India', () => {
  assert.equal(hero.trust.includes('Made in India'), false);
});