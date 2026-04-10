import { expect, test } from '~e2e/fixtures/auth';

test.describe('profile page', { tag: ['@smoke', '@authenticated'] }, () => {
  test('view profile and update display name', async ({ page }) => {
    await page.goto('/profile');

    await test.step('verify profile info is visible', async () => {
      await expect(
        page.getByRole('heading', { name: /profile/i }),
      ).toBeVisible();
      await expect(page.getByText(/e2e/i).first()).toBeVisible();
    });

    await test.step('update display name', async () => {
      const nameInput = page.getByLabel(/display name/i);
      await nameInput.clear();
      await nameInput.fill('E2E Updated');
      await page.getByRole('button', { name: /save/i }).first().click();
      await expect(page.getByText('E2E Updated').first()).toBeVisible();
    });

    await test.step('verify name persists after reload', async () => {
      await page.reload();
      await expect(page.getByLabel(/display name/i)).toHaveValue('E2E Updated');
    });

    await test.step('restore original name', async () => {
      const nameInput = page.getByLabel(/display name/i);
      await nameInput.clear();
      await nameInput.fill('E2E Test User');
      await page.getByRole('button', { name: /save/i }).first().click();
      await expect(page.getByText('E2E Test User').first()).toBeVisible();
      await page.reload();
      await expect(page.getByLabel(/display name/i)).toHaveValue(
        'E2E Test User',
      );
    });
  });

  test('navigate to profile from avatar menu', async ({ page }) => {
    await page.goto('/dashboard');

    await test.step('open avatar menu and click Profile', async () => {
      await page.getByRole('button', { name: /e2e/i }).first().click();
      await page.getByRole('menuitem', { name: /profile/i }).click();
      await expect(page).toHaveURL(/\/profile/);
    });

    await test.step('verify profile page loaded', async () => {
      await expect(
        page.getByRole('heading', { name: /profile/i }),
      ).toBeVisible();
    });
  });
});
