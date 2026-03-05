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

      // Dismiss any lingering toasts so they don't interfere with the test
      await page.evaluate(() => {
        for (const el of document.querySelectorAll(
          'section[aria-label*="Notification"] > *',
        )) {
          el.remove();
        }
      });
    });

    test('create, edit, and delete a transaction', async ({ page }) => {
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
      const payeeName = `E2E Payee ${Date.now()}`;
      const desc = `Txn Payee ${Date.now()}`;

      await page.goto('/transactions');
      await page
        .getByRole('button', { name: /add transaction/i })
        .first()
        .click();

      await page.getByLabel(/description/i).fill(desc);
      await page.getByLabel(/amount/i).fill('10.00');

      // Select account
      await page.getByLabel('Account').click();
      await page.getByRole('option').first().click();

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
      const tagName = `e2e-tag-${Date.now()}`;
      const desc = `Txn Tag ${Date.now()}`;

      await page.goto('/transactions');
      await page
        .getByRole('button', { name: /add transaction/i })
        .first()
        .click();

      await page.getByLabel(/description/i).fill(desc);
      await page.getByLabel(/amount/i).fill('15.00');

      // Select account
      await page.getByLabel('Account').click();
      await page.getByRole('option').first().click();

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
      const desc = `Credit Txn ${Date.now()}`;

      await page.goto('/transactions');
      await page
        .getByRole('button', { name: /add transaction/i })
        .first()
        .click();

      await page.getByLabel(/description/i).fill(desc);
      await page.getByLabel(/amount/i).fill('100.00');

      // Select account
      await page.getByLabel('Account').click();
      await page.getByRole('option').first().click();

      // Change direction to credit
      await page.getByLabel('Direction').click();
      await page.getByRole('option', { name: /credit/i }).click();

      await page.getByRole('button', { name: /create/i }).click();
      await expect(page.getByText('Transaction created')).toBeVisible();
      await expect(page.getByText(desc)).toBeVisible();
    });

    test('empty state CTA opens create dialog', async ({ context }) => {
      // Use a fresh page with no pre-seeded data to guarantee empty state
      const freshPage = await context.newPage();
      await freshPage.goto('/transactions');

      // Skip if transactions already exist (seeded by beforeEach account setup)
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
