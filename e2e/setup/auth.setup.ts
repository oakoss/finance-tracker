import { expect, test as setup } from '@playwright/test';

import { waitForHydration } from '~e2e/fixtures';
import { E2E_EMAIL, E2E_PASSWORD } from '~e2e/fixtures/constants';

setup('authenticate', async ({ page }) => {
  await page.goto('/sign-in');
  await waitForHydration(page);
  await page.getByLabel('Email').fill(E2E_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/dashboard', { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();

  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
