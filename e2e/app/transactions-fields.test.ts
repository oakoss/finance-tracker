import type { Page } from '@playwright/test';

import { expect, test } from '~e2e/fixtures/auth';
import {
  createViaCombobox,
  selectExistingCombobox,
} from '~e2e/fixtures/combobox';
import { createCategory } from '~e2e/fixtures/entity';
import { getField } from '~e2e/fixtures/field';

const CREATE_TXN_HEADING = /create transaction/i;

async function selectAccount(page: Page, accountName: string): Promise<void> {
  await page.getByLabel('Account').click();
  const option = page
    .getByRole('option', { name: new RegExp(accountName, 'i') })
    .first();
  await option.scrollIntoViewIfNeeded();
  await option.click();
}

test.describe('transaction form fields', { tag: ['@authenticated'] }, () => {
  test('creates transaction with category', async ({
    page,
    testAccountName,
  }) => {
    const categoryName = `E2E Cat ${Date.now()}`;
    const desc = `Txn Cat ${Date.now()}`;

    await createCategory(page, categoryName);

    await page.goto('/transactions');
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();
    await page.getByLabel(/description/i).fill(desc);
    await page.getByLabel(/amount/i).fill('25.00');
    await selectAccount(page, testAccountName);
    await page.getByLabel('Category').click();
    await page
      .getByRole('option', { name: new RegExp(categoryName, 'i') })
      .click();
    await page.getByRole('button', { name: /create/i }).click();
    await expect(page.getByText(desc)).toBeVisible();
  });

  test('selects existing payee from dropdown', async ({
    page,
    testAccountName,
  }) => {
    test.slow();
    const payeeName = `E2E ExPayee ${Date.now()}`;

    // Seed a payee by creating a transaction
    await page.goto('/transactions');
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();
    await page.getByLabel(/description/i).fill(`Seed ${Date.now()}`);
    await page.getByLabel(/amount/i).fill('5.00');
    await selectAccount(page, testAccountName);
    await createViaCombobox(page, 'Payee', payeeName);
    await page.getByRole('button', { name: /create/i }).click();
    await expect(
      page.getByRole('heading', { name: CREATE_TXN_HEADING }),
    ).toBeHidden();

    // Select the existing payee in a new transaction
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();
    await page.getByLabel(/description/i).fill(`Pick Payee ${Date.now()}`);
    await page.getByLabel(/amount/i).fill('7.00');
    await selectAccount(page, testAccountName);
    await selectExistingCombobox(page, 'Payee', payeeName);
    await page.getByRole('button', { name: /create/i }).click();
    await expect(
      page.getByRole('heading', { name: CREATE_TXN_HEADING }),
    ).toBeHidden();
  });

  test('selects existing tag from dropdown', async ({
    page,
    testAccountName,
  }) => {
    test.slow();
    const tagName = `e2e-extag-${Date.now()}`;

    // Seed a tag by creating a transaction
    await page.goto('/transactions');
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();
    await page.getByLabel(/description/i).fill(`Seed ${Date.now()}`);
    await page.getByLabel(/amount/i).fill('5.00');
    await selectAccount(page, testAccountName);
    await createViaCombobox(page, 'Tags', tagName);
    await page.getByRole('button', { name: /create/i }).click();
    await expect(
      page.getByRole('heading', { name: CREATE_TXN_HEADING }),
    ).toBeHidden();

    // Reload and select the existing tag
    await page.reload();
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();
    await page.getByLabel(/description/i).fill(`Pick Tag ${Date.now()}`);
    await page.getByLabel(/amount/i).fill('8.00');
    await selectAccount(page, testAccountName);

    const tagsField = getField(page, 'Tags');
    const tagInput = tagsField.getByRole('combobox');
    await tagInput.click();
    const tagOption = page.getByRole('option', { exact: true, name: tagName });
    await tagOption.waitFor({ state: 'visible' });
    await tagOption.click();
    await expect(tagsField.getByText(tagName)).toBeVisible();

    await page.getByRole('button', { name: /create/i }).click();
    await expect(
      page.getByRole('heading', { name: CREATE_TXN_HEADING }),
    ).toBeHidden();
  });

  test('toggles pending switch', async ({ page, testAccountName }) => {
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
    await expect(page.getByText(desc)).toBeVisible();
  });

  test('fills memo field', async ({ page, testAccountName }) => {
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
    await expect(page.getByText(desc)).toBeVisible();
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
      page.getByRole('heading', { name: CREATE_TXN_HEADING }),
    ).toBeVisible();

    await page.getByRole('button', { name: /create/i }).click();

    await expect(
      page.getByRole('heading', { name: CREATE_TXN_HEADING }),
    ).toBeVisible();
    const errorAlerts = page.locator('[data-slot="field-error"]');
    await expect(errorAlerts.first()).toBeVisible();
    expect(await errorAlerts.count()).toBeGreaterThanOrEqual(2);
  });

  test('removes tag badge during create', async ({ page, testAccountName }) => {
    const tagName = `e2e-rmtag-${Date.now()}`;
    const desc = `RmTag Txn ${Date.now()}`;

    await page.goto('/transactions');
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();
    await page.getByLabel(/description/i).fill(desc);
    await page.getByLabel(/amount/i).fill('12.00');
    await selectAccount(page, testAccountName);

    await createViaCombobox(page, 'Tags', tagName);
    await expect(page.getByText(tagName)).toBeVisible();

    await page.getByText(new RegExp(String.raw`${tagName}\s*×`)).click();
    await expect(page.getByText(tagName)).toBeHidden();

    await page.getByRole('button', { name: /create/i }).click();
    await expect(page.getByText(desc)).toBeVisible();
  });

  test('cancel button dismisses dialog without saving', async ({
    page,
    testAccountName,
  }) => {
    const desc = `Cancel Txn ${Date.now()}`;

    await page.goto('/transactions');
    await page
      .getByRole('button', { name: /add transaction/i })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: CREATE_TXN_HEADING }),
    ).toBeVisible();

    await page.getByLabel(/description/i).fill(desc);
    await page.getByLabel(/amount/i).fill('50.00');
    await selectAccount(page, testAccountName);

    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(
      page.getByRole('heading', { name: CREATE_TXN_HEADING }),
    ).toBeHidden();
    await expect(page.getByText(desc)).toBeHidden();
  });
});
