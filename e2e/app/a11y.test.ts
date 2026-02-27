import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

function contrastScan(page: Page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2aa'])
    .withRules(['color-contrast'])
    .analyze();
}

test.describe('accessibility', { tag: '@a11y' }, () => {
  test('landing page has no contrast violations', async ({ page }) => {
    await page.goto('/');
    const results = await contrastScan(page);
    expect(results.violations).toEqual([]);
  });

  test('landing page has no contrast violations in dark mode', async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    await page.goto('/');
    const results = await contrastScan(page);
    expect(results.violations).toEqual([]);
    await context.close();
  });

  test('sign-in page has no contrast violations', async ({ page }) => {
    await page.goto('/sign-in');
    const results = await contrastScan(page);
    expect(results.violations).toEqual([]);
  });

  test('sign-in page has no contrast violations in dark mode', async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    await page.goto('/sign-in');
    const results = await contrastScan(page);
    expect(results.violations).toEqual([]);
    await context.close();
  });

  test('sign-up page has no contrast violations', async ({ page }) => {
    await page.goto('/sign-up');
    const results = await contrastScan(page);
    expect(results.violations).toEqual([]);
  });

  test('sign-up page has no contrast violations in dark mode', async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    await page.goto('/sign-up');
    const results = await contrastScan(page);
    expect(results.violations).toEqual([]);
    await context.close();
  });
});
