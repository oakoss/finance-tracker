import { expect, test } from '@playwright/test';

import { waitForHydration } from '~e2e/fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('sign up', { tag: ['@smoke', '@auth', '@a11y'] }, () => {
  test('renders sign-up form with all fields', async ({ page }) => {
    await page.goto('/sign-up');

    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Create account' }),
    ).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/sign-up');
    await waitForHydration(page);
    await page.getByLabel('Name').click();
    await page.getByLabel('Email').click();
    await page.getByLabel('Password', { exact: true }).click();
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText(/must be/i).first()).toBeVisible();
  });

  test('submits sign-up form with valid data', async ({ page }) => {
    const uniqueEmail = `e2e-signup-${Date.now()}@test.local`;

    await test.step('navigate to sign-up page', async () => {
      await page.goto('/sign-up');
      await waitForHydration(page);
    });

    await test.step('fill form with valid data', async () => {
      await page.getByLabel('Name').click();
      await page.getByLabel('Name').pressSequentially('Test Signup User');
      await page.getByLabel('Email').click();
      await page.getByLabel('Email').pressSequentially(uniqueEmail);
      await page.getByLabel('Password', { exact: true }).click();
      await page
        .getByLabel('Password', { exact: true })
        .pressSequentially('TestPassword1!');
    });

    await test.step('submit form and verify redirect to dashboard', async () => {
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
    });
  });
});
