import { expect, test } from '@playwright/test';

import { waitForHydration } from '~e2e/fixtures';
import { E2E_EMAIL, E2E_PASSWORD } from '~e2e/fixtures/constants';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('sign in', { tag: ['@smoke', '@auth', '@a11y'] }, () => {
  test('signs in with valid credentials', async ({ page }) => {
    await test.step('navigate to sign-in page', async () => {
      await page.goto('/sign-in');
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
      await waitForHydration(page);
    });

    await test.step('fill credentials and submit', async () => {
      await page.getByLabel('Email').fill(E2E_EMAIL);
      await page.getByLabel('Password', { exact: true }).fill(E2E_PASSWORD);
      await page.getByRole('button', { name: 'Sign in' }).click();
    });

    await test.step('verify redirect to dashboard', async () => {
      await expect(page).toHaveURL(/dashboard/);
    });
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/sign-in');
    await waitForHydration(page);
    await page.getByLabel('Email').fill('invalid@example.com');
    await page.getByLabel('Password', { exact: true }).fill('WrongPassword1!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('preserves redirect param after sign-in', async ({ page }) => {
    await test.step('visit protected route while unauthenticated', async () => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/sign-in.*redirect/);
      await waitForHydration(page);
    });

    await test.step('sign in with valid credentials', async () => {
      await page.getByLabel('Email').fill(E2E_EMAIL);
      await page.getByLabel('Password', { exact: true }).fill(E2E_PASSWORD);
      await page.getByRole('button', { name: 'Sign in' }).click();
    });

    await test.step('verify redirect to original destination', async () => {
      await expect(page).toHaveURL(/dashboard/);
    });
  });
});
