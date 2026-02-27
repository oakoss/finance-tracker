import { expect, test as setup } from '@playwright/test';

import { waitForHydration } from '~e2e/fixtures';

setup('authenticate', async ({ page }) => {
  await page.goto('/sign-in');
  await waitForHydration(page);
  await page
    .getByLabel('Email')
    .fill(process.env.E2E_USER_EMAIL ?? 'e2e@test.local');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.E2E_USER_PASSWORD ?? 'E2ePassword1!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/dashboard', { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();

  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
