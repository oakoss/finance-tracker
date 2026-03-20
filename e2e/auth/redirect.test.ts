import { expect, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('auth redirect', { tag: '@smoke' }, () => {
  test('unauthenticated access to /dashboard redirects to sign-in', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/sign-in/);
    await expect(page).toHaveURL(/redirect/);
  });
});
