import { expect, test } from '@playwright/test';

import { waitForHydration } from '~e2e/fixtures';
import { a11yScan } from '~e2e/fixtures/a11y';

test.use({ storageState: { cookies: [], origins: [] } });

const pages = [
  { name: 'landing', path: '/' },
  { name: 'sign-in', path: '/sign-in' },
  { name: 'sign-up', path: '/sign-up' },
];

const colorSchemes = ['light', 'dark'] as const;

test.describe('accessibility', { tag: '@a11y' }, () => {
  for (const { name, path } of pages) {
    for (const scheme of colorSchemes) {
      test(`${name} page has no a11y violations (${scheme})`, async ({
        page,
      }) => {
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
});
