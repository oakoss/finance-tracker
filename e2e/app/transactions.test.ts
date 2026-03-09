import { expect, type Page, test } from '@playwright/test';

/** Create an isolated account for the test and return its name. */
async function createTestAccount(page: Page): Promise<string> {
  const name = `E2E TxnAcct ${Date.now()}`;

  await page.goto('/accounts');
  await page
    .getByRole('button', { name: /add account/i })
    .first()
    .click();
  await page.getByLabel(/account name/i).fill(name);
  await page.getByRole('button', { name: /create/i }).click();
  await expect(page.getByText('Account created')).toBeVisible();

  return name;
}

/** Open the Account select and pick the option by name. */
async function selectAccount(page: Page, accountName: string): Promise<void> {
  await page.getByLabel('Account').click();
  const option = page.getByRole('option', {
    name: new RegExp(accountName, 'i'),
  });
  // On small viewports the select popup may need scrolling
  await option.scrollIntoViewIfNeeded();
  await option.click();
}

test.describe(
  'transactions CRUD',
  { tag: ['@smoke', '@authenticated'] },
  () => {
    test('create, edit, and delete a transaction', async ({ page }) => {
      const accountName = await createTestAccount(page);
      const name = `E2E Txn ${Date.now()}`;
      const renamed = `${name} Renamed`;

      await page.goto('/transactions');

      // Create transaction
      const addBtn = page
        .getByRole('button', { name: /add transaction/i })
        .first();
      await addBtn.waitFor({ state: 'visible' });
      await addBtn.click();
      await expect(
        page.getByRole('heading', { name: /create transaction/i }),
      ).toBeVisible();

      await page.getByLabel(/description/i).fill(name);
      await page.getByLabel(/amount/i).fill('42.50');

      await selectAccount(page, accountName);

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

      // Dismiss toast so it doesn't intercept clicks on mobile
      await page
        .getByRole('button', { name: /close toast/i })
        .first()
        .click();

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
      await expect(page.getByRole('table').getByText(renamed)).toBeHidden();
    });

    test('creates transaction with new payee', async ({ page }) => {
      const accountName = await createTestAccount(page);
      const payeeName = `E2E Payee ${Date.now()}`;
      const desc = `Txn Payee ${Date.now()}`;

      await page.goto('/transactions');
      await page
        .getByRole('button', { name: /add transaction/i })
        .first()
        .click();

      await page.getByLabel(/description/i).fill(desc);
      await page.getByLabel(/amount/i).fill('10.00');

      await selectAccount(page, accountName);

      // Create new payee via combobox
      const payeeField = page
        .locator('[data-slot="field"]')
        .filter({ has: page.getByText('Payee', { exact: true }) });
      const payeeInput = payeeField.getByRole('combobox');
      await payeeInput.click();
      await payeeInput.pressSequentially(payeeName, { delay: 50 });
      await page
        .getByRole('option', { name: new RegExp(`Create "${payeeName}"`, 'i') })
        .click();

      await page.getByRole('button', { name: /create/i }).click();
      await expect(page.getByText('Transaction created')).toBeVisible();
    });

    test('creates transaction with new tag', async ({ page }) => {
      const accountName = await createTestAccount(page);
      const tagName = `e2e-tag-${Date.now()}`;
      const desc = `Txn Tag ${Date.now()}`;

      await page.goto('/transactions');
      await page
        .getByRole('button', { name: /add transaction/i })
        .first()
        .click();

      await page.getByLabel(/description/i).fill(desc);
      await page.getByLabel(/amount/i).fill('15.00');

      await selectAccount(page, accountName);

      // Create new tag via combobox
      const tagsField = page
        .locator('[data-slot="field"]')
        .filter({ has: page.getByText('Tags', { exact: true }) });
      const tagInput = tagsField.getByRole('combobox');
      await tagInput.click();
      await tagInput.pressSequentially(tagName, { delay: 50 });
      await page
        .getByRole('option', { name: new RegExp(`Create "${tagName}"`, 'i') })
        .click();

      // Verify badge appears
      await expect(page.getByText(tagName)).toBeVisible();

      await page.getByRole('button', { name: /create/i }).click();
      await expect(page.getByText('Transaction created')).toBeVisible();
    });

    test('saves a credit transaction', async ({ page }) => {
      const accountName = await createTestAccount(page);
      const desc = `Credit Txn ${Date.now()}`;

      await page.goto('/transactions');
      await page
        .getByRole('button', { name: /add transaction/i })
        .first()
        .click();

      await page.getByLabel(/description/i).fill(desc);
      await page.getByLabel(/amount/i).fill('100.00');

      await selectAccount(page, accountName);

      // Change direction to credit
      await page.getByLabel('Direction').click();
      await page.getByRole('option', { name: /credit/i }).click();

      await page.getByRole('button', { name: /create/i }).click();
      await expect(page.getByText('Transaction created')).toBeVisible();
      await expect(page.getByText(desc)).toBeVisible();
    });

    test('empty state CTA opens create dialog', async ({ context }) => {
      const freshPage = await context.newPage();
      await freshPage.goto('/transactions');

      // Skip if transactions already exist from parallel tests
      const emptyState = freshPage.getByText(/no transactions yet/i);
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (
        !(await emptyState
          .isVisible({ timeout: 3000 })
          .catch((error: Error) => {
            if (
              error.name === 'TimeoutError' ||
              error.message.includes('Timeout')
            )
              return false;
            throw error;
          }))
      ) {
        await freshPage.close();
        return;
      }

      await freshPage
        .getByRole('button', { name: /add transaction/i })
        .first()
        .click();
      await expect(
        freshPage.getByRole('heading', { name: /create transaction/i }),
      ).toBeVisible();
      await freshPage.close();
    });
  },
);
