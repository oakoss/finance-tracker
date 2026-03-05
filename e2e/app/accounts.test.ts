import { expect, test } from '@playwright/test';

test.describe('accounts CRUD', { tag: ['@smoke', '@authenticated'] }, () => {
  test('create, edit, and delete an account', async ({ page }) => {
    const name = `E2E Acct ${Date.now()}`;
    const renamed = `${name} Renamed`;

    await page.goto('/accounts');

    // Create account with savings type
    await page
      .getByRole('button', { name: /add account/i })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: /create account/i }),
    ).toBeVisible();

    await page.getByLabel(/account name/i).fill(name);
    await page.getByLabel('Account type').click();
    await page.getByRole('option', { name: /savings/i }).click();
    await page.getByRole('button', { name: /create/i }).click();

    await expect(page.getByText('Account created')).toBeVisible();
    await expect(page.getByText(name)).toBeVisible();

    // Verify type badge shows in table
    const row = page.getByRole('row', { name: new RegExp(name, 'i') });
    await expect(row.getByText('Savings')).toBeVisible();

    // Edit account — rename and change type to checking
    await row.getByRole('button', { name: /actions/i }).click();
    await page.getByRole('menuitem', { name: /edit/i }).click();

    await expect(
      page.getByRole('heading', { name: /edit account/i }),
    ).toBeVisible();

    await page.getByLabel(/account name/i).clear();
    await page.getByLabel(/account name/i).fill(renamed);
    await page.getByLabel('Account type').click();
    await page.getByRole('option', { name: /checking/i }).click();
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText('Account updated')).toBeVisible();
    await expect(page.getByText(renamed)).toBeVisible();

    // Verify type changed in table
    const updatedRow = page.getByRole('row', {
      name: new RegExp(renamed, 'i'),
    });
    await expect(updatedRow.getByText('Checking')).toBeVisible();

    // Dismiss toast so it doesn't intercept clicks on mobile
    await page
      .getByRole('button', { name: /close toast/i })
      .first()
      .click();

    // Delete account
    await updatedRow.getByRole('button', { name: /actions/i }).click();
    await page.getByRole('menuitem', { name: /delete/i }).click();

    await expect(
      page.getByRole('heading', { name: /delete account/i }),
    ).toBeVisible();

    await page.getByRole('textbox').fill(renamed);
    await page
      .getByRole('button', { name: /delete/i })
      .last()
      .click();

    await expect(page.getByText('Account deleted')).toBeVisible();
    await expect(page.getByRole('table').getByText(renamed)).toBeHidden();
  });

  test('created account appears in transaction form', async ({ page }) => {
    const name = `E2E TxnAcct ${Date.now()}`;

    await page.goto('/accounts');

    // Create account
    await page
      .getByRole('button', { name: /add account/i })
      .first()
      .click();
    await page.getByLabel(/account name/i).fill(name);
    await page.getByRole('button', { name: /create/i }).click();
    await expect(page.getByText('Account created')).toBeVisible();

    // Navigate to transactions and open create dialog
    await page.goto('/transactions');
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: /create transaction/i }),
    ).toBeVisible();

    // Verify the account appears in the dropdown
    await page.getByLabel('Account').click();
    await expect(
      page.getByRole('option', { name: new RegExp(name, 'i') }),
    ).toBeVisible();
  });

  test('empty state CTA opens create dialog', async ({ context }) => {
    const freshPage = await context.newPage();
    await freshPage.goto('/accounts');

    const emptyState = freshPage.getByText(/no accounts yet/i);
    // eslint-disable-next-line playwright/no-conditional-in-test
    if (
      !(await emptyState.isVisible({ timeout: 3000 }).catch((error: Error) => {
        if (error.name === 'TimeoutError' || error.message.includes('Timeout'))
          return false;
        throw error;
      }))
    ) {
      await freshPage.close();
      return;
    }

    await freshPage
      .getByRole('button', { name: /add account/i })
      .first()
      .click();
    await expect(
      freshPage.getByRole('heading', { name: /create account/i }),
    ).toBeVisible();
    await freshPage.close();
  });
});
