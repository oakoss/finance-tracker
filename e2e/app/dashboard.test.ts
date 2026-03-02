import { expect, test } from '@playwright/test';

import { waitForElementHydration } from '~e2e/fixtures';
import { a11yScan } from '~e2e/fixtures/a11y';

test.describe('dashboard', { tag: ['@smoke', '@authenticated'] }, () => {
  test('renders welcome heading', async ({ page }) => {
    await page.goto('/dashboard');
    const heading = page.getByRole('heading', { name: /welcome/i });
    await waitForElementHydration(heading);
    await expect(heading).toBeVisible();
  });

  // TODO: Add empty state test when TREK-24 (dashboard widgets) ships
});

const colorSchemes = ['light', 'dark'] as const;

test.describe(
  'dashboard accessibility',
  { tag: ['@a11y', '@authenticated'] },
  () => {
    for (const scheme of colorSchemes) {
      test(`no a11y violations (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto('/dashboard');
        const heading = page.getByRole('heading', { name: /welcome/i });
        await waitForElementHydration(heading);
        const results = await a11yScan(page);
        expect(results.violations).toEqual([]);
      });
    }
  },
);
