import { expect, test } from '@playwright/test';

import { expect as authExpect, test as authTest } from '~e2e/fixtures/auth';

/**
 * Two tests cover the email-verification gate:
 *
 * 1. A fresh sign-up (storageState cleared) lands on an unverified
 *    session. The banner should appear and the "Add account" CTA
 *    should be disabled.
 * 2. The default authenticated fixture seeds `emailVerified: true`,
 *    so the banner should be absent and the CTA enabled.
 */

test.describe(
  'verification gate — unverified sign-up',
  { tag: ['@smoke', '@auth'] },
  () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('shows banner and disables primary CTA', async ({ page }) => {
      const uniqueEmail = `e2e-verify-${Date.now()}@test.local`;

      await test.step('sign up with fresh email', async () => {
        await page.goto('/sign-up');
        await expect(
          page.getByRole('button', { name: 'Create account' }),
        ).toBeEnabled();
        await page.getByLabel('Name').fill('Verification Test User');
        await page.getByLabel('Email').fill(uniqueEmail);
        await page
          .getByLabel('Password', { exact: true })
          .fill('TestPassword1!');
        await page.getByRole('button', { name: 'Create account' }).click();
        await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
      });

      await test.step('verification banner is visible on dashboard', async () => {
        await expect(
          page.getByText(/verify your email/i).first(),
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: /resend email/i }),
        ).toBeVisible();
      });

      await test.step('primary CTA on accounts is gated', async () => {
        await page.goto('/accounts');
        // Page header + empty-state CTA both render "Add account".
        // `aria-disabled="true"` is the gated marker (native
        // `disabled` would block the tooltip from firing).
        const addButtons = page.getByRole('button', { name: /add account/i });
        const count = await addButtons.count();
        expect(count).toBeGreaterThanOrEqual(1);
        for (let i = 0; i < count; i++) {
          await expect(addButtons.nth(i)).toHaveAttribute(
            'aria-disabled',
            'true',
          );
        }
      });

      await test.step('self-service delete account stays accessible', async () => {
        await page.goto('/profile');
        // The danger-zone delete button must remain enabled for
        // unverified users so they can leave (GDPR escape hatch).
        const deleteButton = page
          .getByRole('button', { name: /delete account/i })
          .first();
        await expect(deleteButton).toBeVisible();
        await expect(deleteButton).toBeEnabled();
      });
    });
  },
);

authTest.describe(
  'verification gate — verified user',
  { tag: ['@smoke', '@auth'] },
  () => {
    authTest('no banner, primary CTA enabled', async ({ page }) => {
      await page.goto('/accounts');

      await authExpect(page.getByText(/verify your email/i)).toBeHidden();

      // Use .first() because header + empty state may both render an
      // "Add account" button.
      const addButton = page
        .getByRole('button', { name: /add account/i })
        .first();
      await authExpect(addButton).toBeEnabled();
      await authExpect(addButton).not.toHaveAttribute('aria-disabled', 'true');
    });
  },
);
