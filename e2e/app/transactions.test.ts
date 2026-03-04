import { expect, test } from '@playwright/test';

test.describe(
  'transactions CRUD',
  { tag: ['@smoke', '@authenticated'] },
  () => {
    test.beforeEach(async ({ page }) => {
      // Ensure at least one account exists for the transaction form
      await page.goto('/accounts');

      const hasAccount = await page
        .getByRole('row')
        .filter({ hasText: /checking|savings|credit/i })
        .count();

      if (hasAccount === 0) {
        await page
          .getByRole('button', { name: /add account/i })
          .first()
          .click();
        await page.getByLabel(/account name/i).fill('E2E Checking');
        await page.getByRole('button', { name: /create/i }).click();
        await expect(page.getByText('Account created')).toBeVisible();
      }
    });

    test('create, edit, and delete a transaction', async ({ page }) => {
      const name = `E2E Txn ${Date.now()}`;
      const renamed = `${name} Renamed`;

      await page.goto('/transactions');

      // Create transaction
      await page
        .getByRole('button', { name: /add transaction/i })
        .first()
        .click();
      await expect(
        page.getByRole('heading', { name: /create transaction/i }),
      ).toBeVisible();

      await page.getByLabel(/description/i).fill(name);
      await page.getByLabel(/amount/i).fill('42.50');

      // Select first account
      await page.getByLabel('Account').click();
      await page.getByRole('option').first().click();

      await page.getByRole('button', { name: /create/i }).click();

      await expect(page.getByText('Transaction created')).toBeVisible();
      await expect(page.getByText(name)).toBeVisible();

      // Edit transaction
      const row = page.getByRole('row', {
        name: new RegExp(name, 'i'),
      });
      await row.getByRole('button', { name: /actions/i }).click();
      await page.getByRole('menuitem', { name: /edit/i }).click();

      await expect(
        page.getByRole('heading', { name: /edit transaction/i }),
      ).toBeVisible();

      await page.getByLabel(/description/i).clear();
      await page.getByLabel(/description/i).fill(renamed);
      await page.getByRole('button', { name: /save/i }).click();

      await expect(page.getByText('Transaction updated')).toBeVisible();
      await expect(page.getByText(renamed)).toBeVisible();

      // Delete transaction
      const updatedRow = page.getByRole('row', {
        name: new RegExp(renamed, 'i'),
      });
      await updatedRow.getByRole('button', { name: /actions/i }).click();
      await page.getByRole('menuitem', { name: /delete/i }).click();

      await expect(
        page.getByRole('heading', { name: /delete transaction/i }),
      ).toBeVisible();

      await page.getByRole('textbox').fill(renamed);
      await page
        .getByRole('button', { name: /delete/i })
        .last()
        .click();

      await expect(page.getByText('Transaction deleted')).toBeVisible();
      await expect(page.getByText(renamed)).toBeHidden();
    });
  },
);
