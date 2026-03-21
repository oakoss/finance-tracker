import { waitForHydration } from '~e2e/fixtures';
import { a11yScan } from '~e2e/fixtures/a11y';
import { expect, test } from '~e2e/fixtures/auth';

const pages = [
  { name: 'accounts', path: '/accounts' },
  { name: 'categories', path: '/categories' },
  { name: 'transactions', path: '/transactions' },
  { name: 'budgets', path: '/budgets' },
  { name: 'imports', path: '/imports' },
];

const colorSchemes = ['light', 'dark'] as const;

test.describe(
  'authenticated page accessibility',
  { tag: ['@a11y', '@authenticated'] },
  () => {
    for (const { name, path } of pages) {
      for (const scheme of colorSchemes) {
        test(`${name} has no a11y violations (${scheme})`, async ({ page }) => {
          await page.emulateMedia({
            colorScheme: scheme,
            reducedMotion: 'reduce',
          });
          await page.goto(path);
          await waitForHydration(page);
          const results = await a11yScan(page);
          expect(results.violations).toEqual([]);
        });
      }
    }
  },
);
