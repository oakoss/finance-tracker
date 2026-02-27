import { test as setup } from '@playwright/test';

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

  try {
    await page.waitForURL('/dashboard', { timeout: 15_000 });
  } catch {
    // Check if an error alert is visible to provide better diagnostics
    const alert = page.getByRole('alert');
    if (await alert.isVisible().catch(() => false)) {
      const text = await alert
        .textContent()
        .catch(() => '(could not read alert)');
      throw new Error(
        `E2E auth setup: login failed with alert: "${text}". ` +
          'Verify E2E_USER_EMAIL/E2E_USER_PASSWORD match the seeded user. ' +
          'Run "pnpm db:seed e2e" if you have not seeded yet.',
      );
    }
    throw new Error(
      'E2E auth setup: login did not redirect to /dashboard and no error alert appeared. ' +
        'Is the dev server running? Run "pnpm dev" and "pnpm db:seed e2e".',
    );
  }

  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
