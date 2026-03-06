import { expect, test } from '@playwright/test';

const COMPONENT_PAGES = [
  'layout',
  'forms',
  'selections',
  // Uncomment as pages are added:
  'overlays',
  // 'data',
  // 'navigation',
  // 'date',
] as const;

test.describe('component demo pages', { tag: ['@demo'] }, () => {
  for (const page of COMPONENT_PAGES) {
    test(`${page} page renders and matches screenshot`, async ({
      page: pw,
    }) => {
      await pw.goto(`/components/${page}`);
      await expect(pw.locator('h2').first()).toBeVisible();
      await expect(pw).toHaveScreenshot(`${page}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});
