import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

function a11yScan(page: Page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
}

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
        browser,
      }) => {
        const context = await browser.newContext({ colorScheme: scheme });
        const page = await context.newPage();
        await page.goto(path);
        const results = await a11yScan(page);
        expect(results.violations).toEqual([]);
        await context.close();
      });
    }
  }
});
