import { expect, test } from '~e2e/fixtures/auth';
import { createViaCombobox } from '~e2e/fixtures/combobox';
import { selectAccount } from '~e2e/fixtures/form-actions';
import {
  clickRowAction,
  confirmDelete,
  isEmptyState,
} from '~e2e/fixtures/table-actions';

const CREATE_TXN_HEADING = /create transaction/i;

test.describe(
  'transactions CRUD',
  { tag: ['@smoke', '@authenticated'] },
  () => {
    test('empty state CTA opens create dialog', async ({ page }) => {
      await page.goto('/transactions');

      // oxlint-disable-next-line playwright/no-conditional-in-test
      if (!(await isEmptyState(page, /no transactions yet/i))) return;

      await page
        .getByRole('button', { name: /add transaction/i })
        .first()
        .click();
      await expect(
        page.getByRole('heading', { name: CREATE_TXN_HEADING }),
      ).toBeVisible();
    });

    test('create, edit, and delete a transaction', async ({
      page,
      testAccountName,
    }) => {
      test.slow();
      const accountName = testAccountName;
      const name = `E2E Txn ${Date.now()}`;
      const renamed = `${name} Renamed`;

      await page.goto('/transactions');

      const addBtn = page
        .getByRole('button', { name: /add transaction/i })
        .first();
      await addBtn.waitFor({ state: 'visible' });
      await addBtn.click();
      await expect(
        page.getByRole('heading', { name: CREATE_TXN_HEADING }),
      ).toBeVisible();

      await page.getByLabel(/description/i).fill(name);
      await page.getByLabel(/amount/i).fill('42.50');
      await selectAccount(page, accountName);
      await page.getByRole('button', { name: /create/i }).click();
      await expect(page.getByText(name)).toBeVisible();

      // Edit
      const row = page.getByRole('row', { name: new RegExp(name, 'i') });
      await clickRowAction(page, row, /edit/i);
      await expect(
        page.getByRole('heading', { name: /edit transaction/i }),
      ).toBeVisible();
      await page.getByLabel(/description/i).clear();
      await page.getByLabel(/description/i).fill(renamed);
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText(renamed)).toBeVisible();

      // Delete
      const updatedRow = page.getByRole('row', {
        name: new RegExp(renamed, 'i'),
      });
      await clickRowAction(page, updatedRow, /delete/i);
      await expect(
        page.getByRole('heading', { name: /delete transaction/i }),
      ).toBeVisible();
      await confirmDelete(page, renamed);
      await expect(page.getByRole('table').getByText(renamed)).toBeHidden();
    });

    test('creates transaction with new payee', async ({
      page,
      testAccountName,
    }) => {
      const desc = `Txn Payee ${Date.now()}`;

      await page.goto('/transactions');
      await page
        .getByRole('button', { name: /add transaction/i })
        .first()
        .click();
      await page.getByLabel(/description/i).fill(desc);
      await page.getByLabel(/amount/i).fill('10.00');
      await selectAccount(page, testAccountName);
      await createViaCombobox(page, 'Payee', `E2E Payee ${Date.now()}`);
      await page.getByRole('button', { name: /create/i }).click();
      await expect(page.getByText(desc)).toBeVisible();
    });

    test('creates transaction with new tag', async ({
      page,
      testAccountName,
    }) => {
      const tagName = `e2e-tag-${Date.now()}`;
      const desc = `Txn Tag ${Date.now()}`;

      await page.goto('/transactions');
      await page
        .getByRole('button', { name: /add transaction/i })
        .first()
        .click();
      await page.getByLabel(/description/i).fill(desc);
      await page.getByLabel(/amount/i).fill('15.00');
      await selectAccount(page, testAccountName);
      await createViaCombobox(page, 'Tags', tagName);
      await expect(page.getByText(tagName)).toBeVisible();
      await page.getByRole('button', { name: /create/i }).click();
      await expect(page.getByText(desc)).toBeVisible();
    });

    test('saves a credit transaction', async ({ page, testAccountName }) => {
      const desc = `Credit Txn ${Date.now()}`;

      await page.goto('/transactions');
      await page
        .getByRole('button', { name: /add transaction/i })
        .first()
        .click();
      await page.getByLabel(/description/i).fill(desc);
      await page.getByLabel(/amount/i).fill('100.00');
      await selectAccount(page, testAccountName);
      await page.getByLabel('Direction').click();
      await page.getByRole('option', { name: /credit/i }).click();
      await page.getByRole('button', { name: /create/i }).click();
      await expect(page.getByText(desc)).toBeVisible();
    });
  },
);
