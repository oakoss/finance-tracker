import type { Locator, Page } from '@playwright/test';

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

/** Create an expense category via the categories page. */
async function createCategory(page: Page, name: string): Promise<void> {
  await page.goto('/categories');
  await page
    .getByRole('button', { name: /add category/i })
    .first()
    .click();
  await page.getByLabel(/category name/i).fill(name);
  await page.getByRole('button', { name: /create/i }).click();
  await expectToast(page, 'Category created');
}

/** Locate a form field by its visible label using `data-slot="field"`. */
function getField(page: Page, label: string): Locator {
  return page
    .locator('[data-slot="field"]')
    .filter({ has: page.getByText(label, { exact: true }) });
}

/** Click a row's edit action and wait for the edit dialog to appear. */
async function openEditDialog(page: Page, desc: string): Promise<void> {
  const row = page.getByRole('row', { name: new RegExp(desc, 'i') });
  await clickRowAction(page, row, /edit/i);
  await expect(
    page.getByRole('heading', { name: /edit transaction/i }),
  ).toBeVisible();
}

test.describe(
  'transactions CRUD',
  { tag: ['@smoke', '@authenticated'] },
  () => {
    test('empty state CTA opens create dialog', async ({ page }) => {
      await page.goto('/transactions');

      // Skip if transactions exist from other tests on this worker
      // oxlint-disable-next-line playwright/no-conditional-in-test
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

    await createCategory(page, categoryName);

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

    const payeeInput = getField(page, 'Payee').getByRole('combobox');
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
    const tagsField = getField(page, 'Tags');
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
    const pendingSwitch = getField(page, 'Pending').getByRole('switch');
    await pendingSwitch.click();
    await expect(pendingSwitch).toBeChecked();

    await page.getByRole('button', { name: /create/i }).click();
    await expectToast(page, 'Transaction created');

    // Verify pending persists by reopening edit dialog
    await openEditDialog(page, desc);
    await expect(getField(page, 'Pending').getByRole('switch')).toBeChecked();
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
    await openEditDialog(page, desc);
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

  test('verifies category, payee, and tag persist after create', async ({
    page,
    testAccountName,
  }) => {
    test.slow();
    const accountName = testAccountName;
    const categoryName = `E2E PersistCat ${Date.now()}`;
    const payeeName = `E2E PersistPayee ${Date.now()}`;
    const tagName = `e2e-persist-${Date.now()}`;
    const desc = `Persist Txn ${Date.now()}`;

    await createCategory(page, categoryName);

    // Create transaction with category + payee + tag
    await page.goto('/transactions');
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();

    await page.getByLabel(/description/i).fill(desc);
    await page.getByLabel(/amount/i).fill('55.00');
    await selectAccount(page, accountName);

    await page.getByLabel('Category').click();
    await page
      .getByRole('option', { name: new RegExp(categoryName, 'i') })
      .click();

    await createViaCombobox(page, 'Payee', payeeName);
    await createViaCombobox(page, 'Tags', tagName);

    await page.getByRole('button', { name: /create/i }).click();
    await expectToast(page, 'Transaction created');

    // Reopen edit dialog and verify all fields persisted
    await openEditDialog(page, desc);

    await expect(page.getByLabel('Category')).toHaveText(
      new RegExp(categoryName, 'i'),
    );
    await expect(getField(page, 'Payee').getByRole('combobox')).toHaveValue(
      payeeName,
    );
    await expect(getField(page, 'Tags').getByText(tagName)).toBeVisible();
  });

  test('edits category, payee, and tags on existing transaction', async ({
    page,
    testAccountName,
  }) => {
    test.slow();
    const accountName = testAccountName;
    const cat1 = `E2E EditCatA ${Date.now()}`;
    const cat2 = `E2E EditCatB ${Date.now()}`;
    const payee1 = `E2E EditPayeeA ${Date.now()}`;
    const payee2 = `E2E EditPayeeB ${Date.now()}`;
    const tag1 = `e2e-edittag1-${Date.now()}`;
    const tag2 = `e2e-edittag2-${Date.now()}`;
    const desc = `EditFields Txn ${Date.now()}`;

    // Create two categories
    await createCategory(page, cat1);
    await createCategory(page, cat2);

    // Create transaction with cat1, payee1, tag1
    await page.goto('/transactions');
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();

    await page.getByLabel(/description/i).fill(desc);
    await page.getByLabel(/amount/i).fill('60.00');
    await selectAccount(page, accountName);

    await page.getByLabel('Category').click();
    await page.getByRole('option', { name: new RegExp(cat1, 'i') }).click();

    await createViaCombobox(page, 'Payee', payee1);
    await createViaCombobox(page, 'Tags', tag1);

    await page.getByRole('button', { name: /create/i }).click();
    await expectToast(page, 'Transaction created');

    // Edit: change category to cat2, payee to payee2, add tag2
    await openEditDialog(page, desc);

    // Change category
    await page.getByLabel('Category').click();
    await page.getByRole('option', { name: new RegExp(cat2, 'i') }).click();

    // Change payee
    const payeeInput = getField(page, 'Payee').getByRole('combobox');
    await payeeInput.clear();
    await payeeInput.pressSequentially(payee2, { delay: 50 });
    await page
      .getByRole('option', { name: new RegExp(`Create "${payee2}"`, 'i') })
      .click();

    // Add second tag
    await createViaCombobox(page, 'Tags', tag2);

    await page.getByRole('button', { name: /save/i }).click();
    await expectToast(page, 'Transaction updated');

    // Reopen and verify changes persisted
    await openEditDialog(page, desc);

    await expect(page.getByLabel('Category')).toHaveText(new RegExp(cat2, 'i'));
    await expect(getField(page, 'Payee').getByRole('combobox')).toHaveValue(
      payee2,
    );
    await expect(getField(page, 'Tags').getByText(tag1)).toBeVisible();
    await expect(getField(page, 'Tags').getByText(tag2)).toBeVisible();
  });

  test('removes tag during edit', async ({ page, testAccountName }) => {
    test.slow();
    const accountName = testAccountName;
    const tagName = `e2e-rmedittag-${Date.now()}`;
    const desc = `RmEditTag Txn ${Date.now()}`;

    // Create transaction with a tag
    await page.goto('/transactions');
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();

    await page.getByLabel(/description/i).fill(desc);
    await page.getByLabel(/amount/i).fill('18.00');
    await selectAccount(page, accountName);
    await createViaCombobox(page, 'Tags', tagName);

    await page.getByRole('button', { name: /create/i }).click();
    await expectToast(page, 'Transaction created');

    // Open edit dialog and verify tag is present
    await openEditDialog(page, desc);
    const tagsField = getField(page, 'Tags');
    await expect(tagsField.getByText(tagName)).toBeVisible();

    // Remove tag by clicking badge
    await tagsField.getByText(new RegExp(String.raw`${tagName}\s*×`)).click();
    await expect(tagsField.getByText(tagName)).toBeHidden();

    await page.getByRole('button', { name: /save/i }).click();
    await expectToast(page, 'Transaction updated');

    // Reopen and verify tag is gone
    await openEditDialog(page, desc);
    await expect(getField(page, 'Tags').getByText(tagName)).toBeHidden();
  });

  test('data grid displays payee, tags, pending badge, and formatted amount', async ({
    page,
    testAccountName,
  }) => {
    test.slow();
    const accountName = testAccountName;
    const payeeName = `E2E GridPayee ${Date.now()}`;
    const tagName = `e2e-gridtag-${Date.now()}`;
    const desc = `Grid Display ${Date.now()}`;

    await page.goto('/transactions');
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();

    await page.getByLabel(/description/i).fill(desc);
    await page.getByLabel(/amount/i).fill('99.99');
    await selectAccount(page, accountName);

    await createViaCombobox(page, 'Payee', payeeName);
    await createViaCombobox(page, 'Tags', tagName);

    // Toggle pending on
    await getField(page, 'Pending').getByRole('switch').click();

    await page.getByRole('button', { name: /create/i }).click();
    await expectToast(page, 'Transaction created');

    // Verify data grid row displays all fields
    const row = page.getByRole('row', { name: new RegExp(desc, 'i') });
    await expect(row).toBeVisible();

    // Amount formatted with minus prefix (debit)
    await expect(row.getByText('-$99.99')).toBeVisible();

    // Payee name in row
    await expect(row.getByText(payeeName)).toBeVisible();

    // Tag badge in row
    await expect(row.getByText(tagName)).toBeVisible();

    // Pending badge in row
    await expect(row.getByText('Pending')).toBeVisible();
  });

  test('cancel button dismisses dialog without saving', async ({
    page,
    testAccountName,
  }) => {
    const accountName = testAccountName;
    const desc = `Cancel Txn ${Date.now()}`;

    await page.goto('/transactions');
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: /create transaction/i }),
    ).toBeVisible();

    await page.getByLabel(/description/i).fill(desc);
    await page.getByLabel(/amount/i).fill('50.00');
    await selectAccount(page, accountName);

    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Dialog should close
    await expect(
      page.getByRole('heading', { name: /create transaction/i }),
    ).toBeHidden();

    // Transaction should not appear in the table
    await expect(page.getByText(desc)).toBeHidden();
  });
});
