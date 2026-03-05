import { expect, type Page, test } from '@playwright/test';

import { waitForHydration } from '~e2e/fixtures';
import { E2E_EMAIL, E2E_PASSWORD } from '~e2e/fixtures/constants';

async function signInViaUI(page: Page) {
  await page.goto('/sign-in');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  await page.getByLabel('Email').fill(E2E_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/dashboard/);
}

/** Open the sidebar sheet on mobile viewports where it starts collapsed. No-op on desktop. */
async function ensureSidebarOpen(page: Page) {
  const userButton = page.getByRole('button', { name: /E2E Test User/i });

  // On desktop the user button is already visible in the sidebar
  if (await userButton.isVisible()) return;

  // On mobile the sidebar is a Sheet — click the trigger to open it
  const trigger = page.locator('[data-sidebar="trigger"]');
  await trigger.click();
  await userButton.waitFor({ state: 'visible', timeout: 5000 });
}

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('sign out', { tag: '@auth' }, () => {
  test('signs out via user menu', async ({ page }) => {
    await test.step('sign in', async () => {
      await signInViaUI(page);
    });

    await test.step('open user menu and click sign out', async () => {
      await ensureSidebarOpen(page);
      const userButton = page.getByRole('button', { name: /E2E Test User/i });
      // dispatchEvent bypasses Playwright's actionability — wait for
      // hydration so the click handler is attached.
      await waitForHydration(page);
      await expect(userButton).toBeVisible();
      // dispatchEvent bypasses Playwright's viewport check — the sidebar
      // footer sits in a position:fixed container that can't be scrolled
      await userButton.dispatchEvent('click');
      await expect(
        page.getByRole('menuitem', { name: 'Sign out' }),
      ).toBeVisible();
      await page.getByRole('menuitem', { name: 'Sign out' }).click();
    });

    await test.step('verify redirect to sign-in', async () => {
      await expect(page).toHaveURL(/sign-in/);
    });

    await test.step('verify session is invalidated', async () => {
      await page.goto('/dashboard');
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
        // Wait for hydration so the BroadcastChannel listener
        // is registered before the first tab signs out.
        await waitForHydration(newPage);
        return newPage;
      });

    await test.step('sign out in first tab', async () => {
      await ensureSidebarOpen(page);
      const userButton = page.getByRole('button', { name: /E2E Test User/i });
      // dispatchEvent bypasses Playwright's actionability — wait for
      // hydration so the click handler is attached.
      await waitForHydration(page);
      await expect(userButton).toBeVisible();
      // dispatchEvent bypasses Playwright's viewport check — the sidebar
      // footer sits in a position:fixed container that can't be scrolled
      await userButton.dispatchEvent('click');
      await page.getByRole('menuitem', { name: 'Sign out' }).click();
      await expect(page).toHaveURL(/sign-in/);
    });

    await test.step('verify second tab redirects to sign-in', async () => {
      await expect(secondPage).toHaveURL(/sign-in/, { timeout: 10_000 });
    });
  });
});
