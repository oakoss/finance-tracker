import { expect, type Page, test } from '@playwright/test';

import { waitForElementHydration, waitForHydration } from '~e2e/fixtures';

const E2E_EMAIL = process.env.E2E_USER_EMAIL ?? 'e2e@test.local';
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD ?? 'E2ePassword1!';

async function signInViaUI(page: Page) {
  await page.goto('/sign-in');
  await waitForHydration(page);
  await page.getByLabel('Email').fill(E2E_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('sign out', { tag: '@auth' }, () => {
  test('signs out via user menu', async ({ page }) => {
    await test.step('sign in', async () => {
      await signInViaUI(page);
    });

    await test.step('open user menu and click sign out', async () => {
      const userButton = page.getByRole('button', { name: /E2E Test User/i });
      await expect(userButton).toBeVisible();
      await waitForElementHydration(userButton);
      await userButton.click();
      await expect(
        page.getByRole('menuitem', { name: 'Sign out' }),
      ).toBeVisible();
      await page.getByRole('menuitem', { name: 'Sign out' }).click();
    });

    await test.step('verify redirect to sign-in', async () => {
      await expect(page).toHaveURL(/sign-in/);
    });
  });

  test('cross-tab sign-out via BroadcastChannel', async ({ context, page }) => {
    await test.step('sign in on first tab', async () => {
      await signInViaUI(page);
    });

    const secondPage =
      await test.step('open dashboard in second tab', async () => {
        const newPage = await context.newPage();
        await newPage.goto('/dashboard');
        await expect(newPage).toHaveURL(/dashboard/);
        // Wait for React hydration so the BroadcastChannel listener
        // is registered before the first tab signs out.
        const secondUserButton = newPage.getByRole('button', {
          name: /E2E Test User/i,
        });
        await expect(secondUserButton).toBeVisible();
        await waitForElementHydration(secondUserButton);
        return newPage;
      });

    await test.step('sign out in first tab', async () => {
      const userButton = page.getByRole('button', { name: /E2E Test User/i });
      await userButton.click();
      await page.getByRole('menuitem', { name: 'Sign out' }).click();
      await expect(page).toHaveURL(/sign-in/);
    });

    await test.step('verify second tab redirects to sign-in', async () => {
      await expect(secondPage).toHaveURL(/sign-in/, { timeout: 10_000 });
    });
  });
});
