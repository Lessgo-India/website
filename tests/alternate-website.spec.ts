import { expect, test } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lessgo.consent.analytics', 'denied');
  });
  await page.goto('/alternate');
});

for (const viewport of [
  { width: 320, height: 720 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
  { width: 1920, height: 1080 },
]) {
  test(`renders without overflow at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await expect(page.getByRole('heading', { level: 1, name: 'Lessgo', exact: true })).toBeVisible();
    await expect(page).toHaveTitle('Lessgo | Good plans. Better company.');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');

    const hero = await page.locator('main > section').first().boundingBox();
    expect(hero).not.toBeNull();
    expect(hero!.y + hero!.height).toBeLessThan(viewport.height - 48);

    const images = page.locator('[data-alternate-website] img');
    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveJSProperty('complete', true);
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    const overflowingElements = await page.locator('[data-alternate-website] :is(h1,h2,h3,p,a,button,input)').evaluateAll(
      (elements) => elements.filter((element) => {
        if (!element.checkVisibility()) return false;
        const bounds = element.getBoundingClientRect();
        return bounds.width > 0 && (bounds.left < -1 || bounds.right > innerWidth + 1);
      }).map((element) => element.textContent),
    );
    expect(overflowingElements).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('alternate-full.png'), fullPage: true });
  });
}

test('filters ideas and restores focus after closing a preview', async ({ page }) => {
  await expect(page.locator('[data-plan-card]')).toHaveCount(4);
  await page.getByRole('button', { name: 'Out of office', exact: true }).click();
  await expect(page.locator('[data-plan-card]')).toHaveCount(2);
  const coast = page.getByRole('button', { name: 'Explore plan idea: That Goa trip. Finally.' });
  await coast.click();
  const dialog = page.getByRole('dialog', { name: 'That Goa trip. Finally.' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('listitem')).toHaveCount(3);
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(coast).toBeFocused();

  await coast.click();
  await dialog.getByRole('link', { name: 'Make your next plan with Lessgo' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/\/alternate#join$/);
  await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
  await page.getByRole('button', { name: 'A bit of everything', exact: true }).click();
  await expect(page.locator('[data-plan-card]')).toHaveCount(4);
});

test('supports keyboard navigation through the real app screenshots', async ({ page }) => {
  const plansTab = page.getByRole('tab', { name: 'The plans', exact: true });
  await plansTab.focus();
  await page.keyboard.press('ArrowRight');
  const splitsTab = page.getByRole('tab', { name: 'The splits', exact: true });
  await expect(splitsTab).toBeFocused();
  await expect(splitsTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  await expect(page.getByRole('img', { name: 'Lessgo Balances screen' })).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Your story', exact: true })).toBeFocused();
  await expect(page.getByRole('img', { name: 'Lessgo Profile screen' })).toBeVisible();
  await page.keyboard.press('Home');
  await expect(plansTab).toBeFocused();
  await expect(page.getByRole('img', { name: 'Lessgo Events screen' })).toBeVisible();
});

test('mobile navigation and FAQ work without covering the page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Open navigation', { exact: true }).click();
  await page.getByRole('link', { name: 'Meet Lessgo', exact: true }).click();
  await expect(page).toHaveURL(/\/alternate#product$/);
  await expect(page.getByRole('link', { name: 'Meet Lessgo', exact: true })).not.toBeVisible();

  await page.getByText('Do all my friends need the app?', { exact: true }).click();
  await expect(page.getByText('No. Invited friends can open', { exact: false })).toBeVisible();
  await page.getByText('Is this a place to find public events?', { exact: true }).click();
  await expect(page.getByText('Lessgo is for making plans with your own people.', { exact: false })).toBeVisible();
  await expect(page.getByText('No. Invited friends can open', { exact: false })).not.toBeVisible();
});

test('launch signup reports an error and succeeds on retry', async ({ page }) => {
  const submissions: unknown[] = [];
  await page.route('**/api/early-access', async (route) => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({
      status: submissions.length === 1 ? 503 : 200,
      json: submissions.length === 1
        ? { ok: false, message: 'Please try again in a moment.' }
        : { ok: true, message: 'You are on the launch list.' },
    });
  });
  const email = page.getByRole('textbox', { name: 'Email address' });
  await email.fill('alternate-test@example.com');
  await page.getByRole('button', { name: 'Get launch updates', exact: true }).click();
  await expect(page.locator('#join').getByRole('alert')).toHaveText('Please try again in a moment.');
  await expect(email).toHaveValue('alternate-test@example.com');
  await page.getByRole('button', { name: 'Get launch updates', exact: true }).click();
  await expect(page.getByText('You are on the launch list.', { exact: true })).toBeVisible();
  expect(submissions).toEqual([
    { email: 'alternate-test@example.com', source: 'alternate-website' },
    { email: 'alternate-test@example.com', source: 'alternate-website' },
  ]);
});

test('the alternate page does not change the original homepage theme', async ({ page }) => {
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await expect(page.locator('[data-alternate-website]')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.getByRole('link', { name: 'Original website', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('[data-alternate-website]')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});