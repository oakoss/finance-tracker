import { expect, test } from '@playwright/test';

test.describe('app shell', { tag: '@smoke' }, () => {
  test('homepage renders with header navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Finance Tracker/i);
    await expect(
      page.getByRole('link', { name: /finance tracker/i }),
    ).toBeVisible();
  });
});
