import { expect, test } from '~e2e/fixtures/auth';

test.describe(
  'preferences dialog',
  { tag: ['@smoke', '@authenticated'] },
  () => {
    test('update currency and time zone from avatar menu', async ({ page }) => {
      await page.goto('/dashboard');

      await test.step('open preferences dialog from avatar menu', async () => {
        await page.getByRole('button', { name: /e2e/i }).first().click();
        await page.getByRole('menuitem', { name: /preferences/i }).click();
        await expect(
          page.getByRole('heading', { name: /preferences/i }),
        ).toBeVisible();
      });

      await test.step('change currency to EUR', async () => {
        const currency = page.getByLabel(/default currency/i);
        await currency.click();
        await currency.fill('EUR');
        await page.getByRole('option', { name: 'EUR' }).first().click();
      });

      await test.step('change time zone to Europe/Berlin', async () => {
        const tz = page.getByLabel(/time zone/i);
        await tz.click();
        await tz.fill('Europe/Berlin');
        await page
          .getByRole('option', { name: 'Europe/Berlin' })
          .first()
          .click();
      });

      await test.step('save and verify dialog closes', async () => {
        await page.getByRole('button', { name: /save/i }).click();
        await expect(
          page.getByRole('heading', { name: /^preferences$/i }),
        ).toBeHidden();
      });

      await test.step('reopen and verify values persisted', async () => {
        await page.getByRole('button', { name: /e2e/i }).first().click();
        await page.getByRole('menuitem', { name: /preferences/i }).click();
        await expect(page.getByLabel(/default currency/i)).toHaveValue('EUR');
        await expect(page.getByLabel(/time zone/i)).toHaveValue(
          'Europe/Berlin',
        );
      });
    });
  },
);
