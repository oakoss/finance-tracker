import type { Page } from '@playwright/test';

import { expect, test } from '~e2e/fixtures/auth';
import { createViaCombobox } from '~e2e/fixtures/combobox';
import {
  clickRowAction,
  confirmDelete,
  expectToast,
  isEmptyState,
} from '~e2e/fixtures/table-actions';

/** Open the Account select and pick the option by name. */
async function selectAccount(page: Page, accountName: string): Promise<void> {
  await page.getByLabel('Account').click();
  const option = page
    .getByRole('option', {
      name: new RegExp(accountName, 'i'),
    })
    .first();
  // On small viewports the select popup may need scrolling
  await option.scrollIntoViewIfNeeded();
  await option.click();
}

test.describe(
  'transactions CRUD',
  { tag: ['@smoke', '@authenticated'] },
  () => {
    test('empty state CTA opens create dialog', async ({ page }) => {
      await page.goto('/transactions');

      // Skip if transactions exist from other tests on this worker
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (!(await isEmptyState(page, /no transactions yet/i))) return;

      await page
        .getByRole('button', { name: /add transaction/i })
        .first()
        .click();
      await expect(
        page.getByRole('heading', { name: /create transaction/i }),
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

      await expectToast(page, 'Transaction created');
      await expect(page.getByText(name)).toBeVisible();

      // Edit transaction
      const row = page.getByRole('row', {
        name: new RegExp(name, 'i'),
      });
      await clickRowAction(page, row, /edit/i);

      await expect(
        page.getByRole('heading', { name: /edit transaction/i }),
      ).toBeVisible();

      await page.getByLabel(/description/i).clear();
      await page.getByLabel(/description/i).fill(renamed);
      await page.getByRole('button', { name: /save/i }).click();

      await expectToast(page, 'Transaction updated');
      await expect(page.getByText(renamed)).toBeVisible();

      // Delete transaction
      const updatedRow = page.getByRole('row', {
        name: new RegExp(renamed, 'i'),
      });
      await clickRowAction(page, updatedRow, /delete/i);

      await expect(
        page.getByRole('heading', { name: /delete transaction/i }),
      ).toBeVisible();

      await confirmDelete(page, renamed);

      await expectToast(page, 'Transaction deleted');
      await expect(page.getByRole('table').getByText(renamed)).toBeHidden();
    });

    test('creates transaction with new payee', async ({
      page,
      testAccountName,
    }) => {
      const accountName = testAccountName;
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
      await createViaCombobox(page, 'Payee', payeeName);

      await page.getByRole('button', { name: /create/i }).click();
      await expectToast(page, 'Transaction created');
    });

    test('creates transaction with new tag', async ({
      page,
      testAccountName,
    }) => {
      const accountName = testAccountName;
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
      await createViaCombobox(page, 'Tags', tagName);

      // Verify badge appears
      await expect(page.getByText(tagName)).toBeVisible();

      await page.getByRole('button', { name: /create/i }).click();
      await expectToast(page, 'Transaction created');
    });

    test('saves a credit transaction', async ({ page, testAccountName }) => {
      const accountName = testAccountName;
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
      await expectToast(page, 'Transaction created');
      await expect(page.getByText(desc)).toBeVisible();
    });
  },
);

test.describe('transaction form fields', { tag: ['@authenticated'] }, () => {
  test('creates transaction with category', async ({
    page,
    testAccountName,
  }) => {
    const accountName = testAccountName;
    const categoryName = `E2E Cat ${Date.now()}`;
    const desc = `Txn Cat ${Date.now()}`;

    // Create a category first
    await page.goto('/categories');
    await page
      .getByRole('button', { name: /add category/i })
      .first()
      .click();
    await page.getByLabel(/category name/i).fill(categoryName);
    await page.getByRole('button', { name: /create/i }).click();
    await expectToast(page, 'Category created');

    // Create transaction with that category
    await page.goto('/transactions');
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();

    await page.getByLabel(/description/i).fill(desc);
    await page.getByLabel(/amount/i).fill('25.00');
    await selectAccount(page, accountName);

    await page.getByLabel('Category').click();
    await page
      .getByRole('option', { name: new RegExp(categoryName, 'i') })
      .click();

    await page.getByRole('button', { name: /create/i }).click();
    await expectToast(page, 'Transaction created');
  });

  test('selects existing payee from dropdown', async ({
    page,
    testAccountName,
  }) => {
    test.slow();
    const accountName = testAccountName;
    const payeeName = `E2E ExPayee ${Date.now()}`;

    // Create a transaction with a new payee to seed the payee list
    await page.goto('/transactions');
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();
    await page.getByLabel(/description/i).fill(`Seed ${Date.now()}`);
    await page.getByLabel(/amount/i).fill('5.00');
    await selectAccount(page, accountName);
    await createViaCombobox(page, 'Payee', payeeName);
    await page.getByRole('button', { name: /create/i }).click();
    await expectToast(page, 'Transaction created');

    // Create another transaction selecting the existing payee
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();
    await page.getByLabel(/description/i).fill(`Pick Payee ${Date.now()}`);
    await page.getByLabel(/amount/i).fill('7.00');
    await selectAccount(page, accountName);

    const payeeField = page
      .locator('[data-slot="field"]')
      .filter({ has: page.getByText('Payee', { exact: true }) });
    const payeeInput = payeeField.getByRole('combobox');
    await payeeInput.click();
    await payeeInput.pressSequentially(payeeName, { delay: 50 });
    // Select existing payee (not "Create ...")
    await page.getByRole('option', { exact: true, name: payeeName }).click();

    await page.getByRole('button', { name: /create/i }).click();
    await expectToast(page, 'Transaction created');
  });

  test('selects existing tag from dropdown', async ({
    page,
    testAccountName,
  }) => {
    test.slow();
    const accountName = testAccountName;
    const tagName = `e2e-extag-${Date.now()}`;

    // Create a transaction with a new tag to seed the tag list
    await page.goto('/transactions');
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();
    await page.getByLabel(/description/i).fill(`Seed ${Date.now()}`);
    await page.getByLabel(/amount/i).fill('5.00');
    await selectAccount(page, accountName);
    await createViaCombobox(page, 'Tags', tagName);
    await page.getByRole('button', { name: /create/i }).click();
    await expectToast(page, 'Transaction created');

    // Full reload to clear React state, then open fresh dialog
    await page.reload();
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();
    await page.getByLabel(/description/i).fill(`Pick Tag ${Date.now()}`);
    await page.getByLabel(/amount/i).fill('8.00');
    await selectAccount(page, accountName);

    // Select existing tag from dropdown
    const tagsField = page
      .locator('[data-slot="field"]')
      .filter({ has: page.getByText('Tags', { exact: true }) });
    const tagInput = tagsField.getByRole('combobox');
    await tagInput.click();
    const tagOption = page.getByRole('option', {
      exact: true,
      name: tagName,
    });
    await tagOption.waitFor({ state: 'visible' });
    await tagOption.click();

    // Verify badge appears in the form (not the table)
    await expect(tagsField.getByText(tagName)).toBeVisible();

    await page.getByRole('button', { name: /create/i }).click();
    await expectToast(page, 'Transaction created');
  });

  test('toggles pending switch', async ({ page, testAccountName }) => {
    const accountName = testAccountName;
    const desc = `Pending Txn ${Date.now()}`;

    await page.goto('/transactions');
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();

    await page.getByLabel(/description/i).fill(desc);
    await page.getByLabel(/amount/i).fill('30.00');
    await selectAccount(page, accountName);

    // Toggle pending on
    const pendingField = page
      .locator('[data-slot="field"]')
      .filter({ has: page.getByText('Pending', { exact: true }) });
    const pendingSwitch = pendingField.getByRole('switch');
    await pendingSwitch.click();
    await expect(pendingSwitch).toBeChecked();

    await page.getByRole('button', { name: /create/i }).click();
    await expectToast(page, 'Transaction created');

    // Verify pending persists by reopening edit dialog
    const row = page.getByRole('row', { name: new RegExp(desc, 'i') });
    await clickRowAction(page, row, /edit/i);
    const editPendingField = page
      .locator('[data-slot="field"]')
      .filter({ has: page.getByText('Pending', { exact: true }) });
    await expect(editPendingField.getByRole('switch')).toBeChecked();
  });

  test('fills memo field', async ({ page, testAccountName }) => {
    const accountName = testAccountName;
    const desc = `Memo Txn ${Date.now()}`;
    const memo = 'Test memo content for E2E';

    await page.goto('/transactions');
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();

    await page.getByLabel(/description/i).fill(desc);
    await page.getByLabel(/amount/i).fill('20.00');
    await selectAccount(page, accountName);

    await page.getByLabel('Memo').fill(memo);

    await page.getByRole('button', { name: /create/i }).click();
    await expectToast(page, 'Transaction created');

    // Verify memo persists by opening edit dialog
    const row = page.getByRole('row', { name: new RegExp(desc, 'i') });
    await clickRowAction(page, row, /edit/i);
    await expect(page.getByLabel('Memo')).toHaveValue(memo);
  });

  test('shows validation errors for missing required fields', async ({
    page,
  }) => {
    await page.goto('/transactions');
    const addBtn = page
      .getByRole('button', { name: /add transaction/i })
      .first();
    await addBtn.waitFor({ state: 'visible' });
    await addBtn.click();
    await expect(
      page.getByRole('heading', { name: /create transaction/i }),
    ).toBeVisible();

    // Submit without filling any fields
    await page.getByRole('button', { name: /create/i }).click();

    // Should show validation errors (form stays open with error alerts)
    await expect(
      page.getByRole('heading', { name: /create transaction/i }),
    ).toBeVisible();
    const errorAlerts = page.locator('[data-slot="field-error"]');
    await expect(errorAlerts.first()).toBeVisible();
    expect(await errorAlerts.count()).toBeGreaterThanOrEqual(2);
  });

  test('removes tag badge during create', async ({ page, testAccountName }) => {
    const accountName = testAccountName;
    const tagName = `e2e-rmtag-${Date.now()}`;
    const desc = `RmTag Txn ${Date.now()}`;

    await page.goto('/transactions');
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();

    await page.getByLabel(/description/i).fill(desc);
    await page.getByLabel(/amount/i).fill('12.00');
    await selectAccount(page, accountName);

    // Add a tag
    await createViaCombobox(page, 'Tags', tagName);
    await expect(page.getByText(tagName)).toBeVisible();

    // Remove it by clicking the badge
    await page.getByText(new RegExp(String.raw`${tagName}\s*×`)).click();
    await expect(page.getByText(tagName)).toBeHidden();

    await page.getByRole('button', { name: /create/i }).click();
    await expectToast(page, 'Transaction created');
  });
});
