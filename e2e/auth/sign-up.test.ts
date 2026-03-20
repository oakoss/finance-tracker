import { expect, test } from '@playwright/test';

import { E2E_EMAIL } from '~e2e/fixtures/constants';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('sign up', { tag: ['@smoke', '@a11y'] }, () => {
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
    await expect(
      page.getByRole('button', { name: 'Create account' }),
    ).toBeEnabled();
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
      await expect(
        page.getByRole('button', { name: 'Create account' }),
      ).toBeEnabled();
    });

    await test.step('fill form with valid data', async () => {
      await page.getByLabel('Name').fill('Test Signup User');
      await page.getByLabel('Email').fill(uniqueEmail);
      await page.getByLabel('Password', { exact: true }).fill('TestPassword1!');
    });

    await test.step('submit form and verify redirect to dashboard', async () => {
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
    });
  });

  test('shows error when signing up with duplicate email', async ({ page }) => {
    await test.step('navigate to sign-up page', async () => {
      await page.goto('/sign-up');
      await expect(
        page.getByRole('button', { name: 'Create account' }),
      ).toBeEnabled();
    });

    await test.step('fill form with existing E2E user email', async () => {
      await page.getByLabel('Name').fill('Duplicate User');
      await page.getByLabel('Email').fill(E2E_EMAIL);
      await page.getByLabel('Password', { exact: true }).fill('TestPassword1!');
    });

    await test.step('submit and verify error banner appears', async () => {
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page.getByRole('alert')).toBeVisible();
    });
  });
});
