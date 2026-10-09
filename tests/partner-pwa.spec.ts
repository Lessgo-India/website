import { expect, test, type Page } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await page.setViewportSize({ width: 390, height: 844 });
});

test('public partner routes fit a phone viewport', async ({ page }) => {
  await page.goto('/partner');
  await expect(
    page.getByRole('heading', { name: /Bring groups/ }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto('/partner/login');
  await expect(
    page.getByRole('heading', { name: 'Partner sign in' }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto('/partner/signup');
  await expect(
    page.getByRole('heading', { name: /Tell us how your business/ }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('signed-in portal keeps mobile navigation and content within the viewport', async ({
  page,
}) => {
  await page.goto('/partner/login');
  await page.getByLabel('User ID').fill('brewbros.owner');
  await page.getByLabel('Password', { exact: true }).fill('Lessgo@2026');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/partner\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Brew Bros' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const mobileNavigation = page
    .getByRole('navigation', { name: 'Partner portal' })
    .last();
  await expect(mobileNavigation).toBeVisible();
  const touchTargetHeights = await mobileNavigation
    .getByRole('link')
    .evaluateAll((links) =>
      links.map((link) => link.getBoundingClientRect().height),
    );
  expect(touchTargetHeights.every((height) => height >= 48)).toBe(true);

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Partner app' }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('manifest, worker scope, and offline cache stay partner-safe', async ({
  page,
  request,
}) => {
  await page.goto('/partner/login');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/partner/manifest.webmanifest',
  );

  const manifestResponse = await request.get('/partner/manifest.webmanifest');
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    id: '/partner',
    scope: '/partner',
    start_url: '/partner/login?source=pwa',
    display: 'standalone',
  });

  for (const icon of [
    '/partner/icon-192.png',
    '/partner/icon-512.png',
    '/partner/icon-maskable-512.png',
    '/partner/apple-touch-icon.png',
  ]) {
    expect((await request.get(icon)).ok()).toBe(true);
  }

  const workerResponse = await request.get('/partner-sw.js');
  expect(workerResponse.ok()).toBe(true);
  expect(workerResponse.headers()['service-worker-allowed']).toBe('/partner');
  expect(workerResponse.headers()['cache-control']).toContain('no-cache');

  await expect
    .poll(() =>
      page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) return '';
        return (await navigator.serviceWorker.ready).scope;
      }),
    )
    .toContain('/partner');

  const cachedUrls = await page.evaluate(async () => {
    const names = await caches.keys();
    const groups = await Promise.all(
      names.map(async (name) => {
        const cache = await caches.open(name);
        return (await cache.keys()).map((entry) => entry.url);
      }),
    );
    return groups.flat();
  });
  expect(
    cachedUrls.some((url) => url.endsWith('/partner/offline.html')),
  ).toBe(true);
  expect(cachedUrls.some((url) => url.includes('/api/partner'))).toBe(false);
  expect(
    cachedUrls.some(
      (url) => new URL(url).pathname === '/partner/login',
    ),
  ).toBe(false);
});
