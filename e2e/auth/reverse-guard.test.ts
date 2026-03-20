import { expect, test } from '~e2e/fixtures/auth';

test.describe(
  'reverse auth guard',
  { tag: ['@smoke', '@authenticated'] },
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
