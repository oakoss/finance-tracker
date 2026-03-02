import { expect, test } from '@playwright/test';

test.describe(
  'reverse auth guard',
  { tag: ['@smoke', '@auth', '@authenticated'] },
  () => {
    test('authenticated access to /sign-in redirects to dashboard', async ({
      page,
    }) => {
      await page.goto('/sign-in');
      await expect(page).toHaveURL(/dashboard/);
    });

    test('authenticated access to /sign-up redirects to dashboard', async ({
      page,
    }) => {
      await page.goto('/sign-up');
      await expect(page).toHaveURL(/dashboard/);
    });
  },
);
