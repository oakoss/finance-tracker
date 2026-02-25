import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

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

  test('login page has no contrast violations', async ({ page }) => {
    await page.goto('/login');
    const results = await contrastScan(page);
    expect(results.violations).toEqual([]);
  });

  test('login page has no contrast violations in dark mode', async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    await page.goto('/login');
    const results = await contrastScan(page);
    expect(results.violations).toEqual([]);
    await context.close();
  });
});
