import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { footer } from './site.ts';

const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../app');

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

  if (segments[0] === 'admin' || segments.some((segment) => segment.includes('['))) {
    return null;
  }

  return segments.length > 0 ? `/${segments.join('/')}` : '/';
}

const publicPagePaths = collectPageFiles(appDirectory)
  .map(staticPublicPath)
  .filter((path) => path !== null);

const footerHrefs = footer.columns.flatMap((column) =>
  column.links.map((link) => link.href),
);

test('footer links to every non-admin static site page', () => {
  for (const path of publicPagePaths) {
    assert.ok(footerHrefs.includes(path), `Missing public footer link: ${path}`);
  }
});

test('footer never exposes admin routes', () => {
  assert.equal(
    footerHrefs.some((href) => href === '/admin' || href.startsWith('/admin/')),
    false,
  );
});