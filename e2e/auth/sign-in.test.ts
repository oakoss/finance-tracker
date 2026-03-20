import { expect, test } from '@playwright/test';

import { E2E_EMAIL, E2E_PASSWORD } from '~e2e/fixtures/constants';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('sign in', { tag: ['@smoke', '@a11y', '@mobile'] }, () => {
  test('signs in with valid credentials', async ({ page }) => {
    await test.step('navigate to sign-in page', async () => {
      await page.goto('/sign-in');
      // Button is disabled until hydrated — wait for enabled to ensure
      // React event handlers are attached before filling inputs.
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
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
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    await page.getByLabel('Email').fill('invalid@example.com');
    await page.getByLabel('Password', { exact: true }).fill('WrongPassword1!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('shows validation error for malformed email', async ({ page }) => {
    await test.step('navigate to sign-in page', async () => {
      await page.goto('/sign-in');
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    });

    await test.step('fill invalid email and submit', async () => {
      await page.getByLabel('Email').fill('not-an-email');
      await page.getByLabel('Password', { exact: true }).fill('SomePassword1!');
      await page.getByRole('button', { name: 'Sign in' }).click();
    });

    await test.step('verify field validation error renders', async () => {
      await expect(page.getByRole('alert')).toBeVisible();
    });
  });

  test('rejects protocol-relative redirect param', async ({ page }) => {
    await test.step('navigate to sign-in with malicious redirect', async () => {
      await page.goto('/sign-in?redirect=%2F%2Fevil.com');
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    });

    await test.step('sign in with valid credentials', async () => {
      await page.getByLabel('Email').fill(E2E_EMAIL);
      await page.getByLabel('Password', { exact: true }).fill(E2E_PASSWORD);
      await page.getByRole('button', { name: 'Sign in' }).click();
    });

    await test.step('verify redirect to dashboard, not evil.com', async () => {
      await expect(page).toHaveURL(/dashboard/);
    });
  });

  test('rejects absolute URL redirect param', async ({ page }) => {
    await test.step('navigate to sign-in with absolute URL redirect', async () => {
      await page.goto('/sign-in?redirect=https%3A%2F%2Fevil.com');
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    });

    await test.step('sign in with valid credentials', async () => {
      await page.getByLabel('Email').fill(E2E_EMAIL);
      await page.getByLabel('Password', { exact: true }).fill(E2E_PASSWORD);
      await page.getByRole('button', { name: 'Sign in' }).click();
    });

    await test.step('verify redirect to dashboard, not evil.com', async () => {
      await expect(page).toHaveURL(/dashboard/);
    });
  });

  test('preserves redirect param after sign-in', async ({ page }) => {
    await test.step('visit protected route while unauthenticated', async () => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/sign-in.*redirect/);
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
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
