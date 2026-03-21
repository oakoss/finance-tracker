import type { Page } from '@playwright/test';

import { expect, test } from '~e2e/fixtures/auth';
import { createViaCombobox } from '~e2e/fixtures/combobox';
import { createCategory } from '~e2e/fixtures/entity';
import { getField } from '~e2e/fixtures/field';
import { openEditDialog } from '~e2e/fixtures/table-actions';

const EDIT_TXN_HEADING = /edit transaction/i;

async function selectAccount(page: Page, accountName: string): Promise<void> {
  await page.getByLabel('Account').click();
  const option = page
    .getByRole('option', { name: new RegExp(accountName, 'i') })
    .first();
  await option.scrollIntoViewIfNeeded();
  await option.click();
}

test.describe(
  'transaction edit and persistence',
  { tag: ['@authenticated'] },
  () => {
    test('pending switch persists after save', async ({
      page,
      testAccountName,
    }) => {
      const desc = `Pending Txn ${Date.now()}`;

      await page.goto('/transactions');
      await page
        .getByRole('button', { name: /add transaction/i })
        .first()
        .click();
      await page.getByLabel(/description/i).fill(desc);
      await page.getByLabel(/amount/i).fill('30.00');
      await selectAccount(page, testAccountName);

      const pendingSwitch = getField(page, 'Pending').getByRole('switch');
      await pendingSwitch.click();
      await expect(pendingSwitch).toBeChecked();

      await page.getByRole('button', { name: /create/i }).click();

      await openEditDialog(page, desc, EDIT_TXN_HEADING);
      await expect(getField(page, 'Pending').getByRole('switch')).toBeChecked();
    });

    test('memo persists after save', async ({ page, testAccountName }) => {
      const desc = `Memo Txn ${Date.now()}`;
      const memo = 'Test memo content for E2E';

      await page.goto('/transactions');
      await page
        .getByRole('button', { name: /add transaction/i })
        .first()
        .click();
      await page.getByLabel(/description/i).fill(desc);
      await page.getByLabel(/amount/i).fill('20.00');
      await selectAccount(page, testAccountName);
      await page.getByLabel('Memo').fill(memo);
      await page.getByRole('button', { name: /create/i }).click();

      await openEditDialog(page, desc, EDIT_TXN_HEADING);
      await expect(page.getByLabel('Memo')).toHaveValue(memo);
    });

    test('category, payee, and tag persist after create', async ({
      page,
      testAccountName,
    }) => {
      test.slow();
      const categoryName = `E2E PersistCat ${Date.now()}`;
      const payeeName = `E2E PersistPayee ${Date.now()}`;
      const tagName = `e2e-persist-${Date.now()}`;
      const desc = `Persist Txn ${Date.now()}`;

      await createCategory(page, categoryName);

      await page.goto('/transactions');
      await page
        .getByRole('button', { name: /add transaction/i })
        .first()
        .click();
      await page.getByLabel(/description/i).fill(desc);
      await page.getByLabel(/amount/i).fill('55.00');
      await selectAccount(page, testAccountName);

      await page.getByLabel('Category').click();
      await page
        .getByRole('option', { name: new RegExp(categoryName, 'i') })
        .click();
      await createViaCombobox(page, 'Payee', payeeName);
      await createViaCombobox(page, 'Tags', tagName);

      await page.getByRole('button', { name: /create/i }).click();

      await openEditDialog(page, desc, EDIT_TXN_HEADING);
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
      const cat1 = `E2E EditCatA ${Date.now()}`;
      const cat2 = `E2E EditCatB ${Date.now()}`;
      const payee1 = `E2E EditPayeeA ${Date.now()}`;
      const payee2 = `E2E EditPayeeB ${Date.now()}`;
      const tag1 = `e2e-edittag1-${Date.now()}`;
      const tag2 = `e2e-edittag2-${Date.now()}`;
      const desc = `EditFields Txn ${Date.now()}`;

      await createCategory(page, cat1);
      await createCategory(page, cat2);

      await page.goto('/transactions');
      await page
        .getByRole('button', { name: /add transaction/i })
        .first()
        .click();
      await page.getByLabel(/description/i).fill(desc);
      await page.getByLabel(/amount/i).fill('60.00');
      await selectAccount(page, testAccountName);

      await page.getByLabel('Category').click();
      await page.getByRole('option', { name: new RegExp(cat1, 'i') }).click();
      await createViaCombobox(page, 'Payee', payee1);
      await createViaCombobox(page, 'Tags', tag1);
      await page.getByRole('button', { name: /create/i }).click();

      // Edit: change category, payee, add tag
      await openEditDialog(page, desc, EDIT_TXN_HEADING);
      await page.getByLabel('Category').click();
      await page.getByRole('option', { name: new RegExp(cat2, 'i') }).click();

      const payeeInput = getField(page, 'Payee').getByRole('combobox');
      await payeeInput.clear();
      await payeeInput.pressSequentially(payee2, { delay: 50 });
      await page
        .getByRole('option', { name: new RegExp(`Create "${payee2}"`, 'i') })
        .click();
      await createViaCombobox(page, 'Tags', tag2);

      await page.getByRole('button', { name: /save/i }).click();

      // Verify changes persisted
      await openEditDialog(page, desc, EDIT_TXN_HEADING);
      await expect(page.getByLabel('Category')).toHaveText(
        new RegExp(cat2, 'i'),
      );
      await expect(getField(page, 'Payee').getByRole('combobox')).toHaveValue(
        payee2,
      );
      await expect(getField(page, 'Tags').getByText(tag1)).toBeVisible();
      await expect(getField(page, 'Tags').getByText(tag2)).toBeVisible();
    });

    test('removes tag during edit', async ({ page, testAccountName }) => {
      test.slow();
      const tagName = `e2e-rmedittag-${Date.now()}`;
      const desc = `RmEditTag Txn ${Date.now()}`;

      await page.goto('/transactions');
      await page
        .getByRole('button', { name: /add transaction/i })
        .first()
        .click();
      await page.getByLabel(/description/i).fill(desc);
      await page.getByLabel(/amount/i).fill('18.00');
      await selectAccount(page, testAccountName);
      await createViaCombobox(page, 'Tags', tagName);
      await page.getByRole('button', { name: /create/i }).click();

      await openEditDialog(page, desc, EDIT_TXN_HEADING);
      const tagsField = getField(page, 'Tags');
      await expect(tagsField.getByText(tagName)).toBeVisible();

      await tagsField.getByText(new RegExp(String.raw`${tagName}\s*×`)).click();
      await expect(tagsField.getByText(tagName)).toBeHidden();
      await page.getByRole('button', { name: /save/i }).click();

      await openEditDialog(page, desc, EDIT_TXN_HEADING);
      await expect(getField(page, 'Tags').getByText(tagName)).toBeHidden();
    });

    test('data grid displays payee, tags, pending badge, and formatted amount', async ({
      page,
      testAccountName,
    }) => {
      test.slow();
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
      await selectAccount(page, testAccountName);
      await createViaCombobox(page, 'Payee', payeeName);
      await createViaCombobox(page, 'Tags', tagName);
      await getField(page, 'Pending').getByRole('switch').click();
      await page.getByRole('button', { name: /create/i }).click();

      const row = page.getByRole('row', { name: new RegExp(desc, 'i') });
      await expect(row).toBeVisible();
      await expect(row.getByText('-$99.99')).toBeVisible();
      await expect(row.getByText(payeeName)).toBeVisible();
      await expect(row.getByText(tagName)).toBeVisible();
      await expect(row.getByText('Pending')).toBeVisible();
    });
  },
);
