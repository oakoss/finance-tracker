import { waitForHydration } from '~e2e/fixtures';
import { a11yScan } from '~e2e/fixtures/a11y';
import { expect, test } from '~e2e/fixtures/auth';

test.describe(
  'dashboard',
  { tag: ['@smoke', '@authenticated', '@mobile'] },
  () => {
    test('renders welcome heading', async ({ page }) => {
      await page.goto('/dashboard');
      const heading = page.getByRole('heading', { name: /welcome/i });
      await expect(heading).toBeVisible();
    });

    // TODO: Add empty state test once the dashboard widgets ship.
  },
);

const colorSchemes = ['light', 'dark'] as const;

test.describe(
  'dashboard accessibility',
  { tag: ['@a11y', '@authenticated'] },
  () => {
    for (const scheme of colorSchemes) {
      test(`no a11y violations (${scheme})`, async ({ page }) => {
        await page.emulateMedia({
          colorScheme: scheme,
          reducedMotion: 'reduce',
        });
        await page.goto('/dashboard');
        await waitForHydration(page);
        const results = await a11yScan(page);
        expect(results.violations).toEqual([]);
      });
    }
  },
);
