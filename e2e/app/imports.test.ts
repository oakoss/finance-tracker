import { expect, test } from '~e2e/fixtures/auth';
import {
  clickRowAction,
  confirmDelete,
  expectToast,
  isEmptyState,
} from '~e2e/fixtures/table-actions';

/** Generate a unique CSV so the file hash differs across projects/runs. */
function uniqueCsv() {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return [
    'Transaction Date,Post Date,Description,Category,Type,Amount,Memo',
    `01/15/2024,01/16/2024,STARBUCKS #${id},Food & Drink,Sale,-5.75,`,
    '01/16/2024,01/17/2024,AMAZON.COM*ABC123,Shopping,Sale,-42.99,',
    '01/17/2024,01/18/2024,UBER TRIP,Travel,Sale,-18.50,',
  ].join('\n');
}

test.describe(
  'imports CSV upload',
  { tag: ['@smoke', '@authenticated'] },
  () => {
    test('upload CSV happy path', async ({ page, testAccountName }) => {
      test.slow();

      await page.goto('/imports');

      // Open upload dialog
      await page
        .getByRole('button', { name: /upload csv/i })
        .first()
        .click();
      await expect(
        page.getByRole('heading', { name: /import csv/i }),
      ).toBeVisible();

      // Select account
      await page
        .getByLabel(/account/i)
        .first()
        .click();
      await page
        .getByRole('option', { name: new RegExp(testAccountName, 'i') })
        .click();

      // Upload unique CSV (avoids duplicate-hash rejection across projects)
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        buffer: Buffer.from(uniqueCsv()),
        mimeType: 'text/csv',
        name: 'chase-sample.csv',
      });

      // Submit
      await page.getByRole('button', { name: /^import$/i }).click();

      await expectToast(page, /csv imported/i);

      // Verify import appears in the list
      await expect(page.getByText('chase-sample.csv')).toBeVisible();
    });

    test('delete import via row action', async ({ page, testAccountName }) => {
      test.slow();

      // Upload a CSV to delete
      await page.goto('/imports');
      await page
        .getByRole('button', { name: /upload csv/i })
        .first()
        .click();
      await page
        .getByLabel(/account/i)
        .first()
        .click();
      await page
        .getByRole('option', { name: new RegExp(testAccountName, 'i') })
        .click();

      const fileName = 'delete-test.csv';
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        buffer: Buffer.from(uniqueCsv()),
        mimeType: 'text/csv',
        name: fileName,
      });
      await page.getByRole('button', { name: /^import$/i }).click();
      await expectToast(page, /csv imported/i);

      // Delete it
      const row = page.getByRole('row', { name: new RegExp(fileName, 'i') });
      await clickRowAction(page, row, /delete/i);
      await confirmDelete(page, fileName);
      await expectToast(page, /import deleted/i);

      // Verify it's gone
      await expect(page.getByText(fileName)).toBeHidden();
    });

    test('empty state shows upload CTA', async ({ page }) => {
      await page.goto('/imports');

      // oxlint-disable-next-line playwright/no-conditional-in-test
      if (!(await isEmptyState(page, /no imports yet/i))) return;

      await page
        .getByRole('button', { name: /upload csv/i })
        .first()
        .click();
      await expect(
        page.getByRole('heading', { name: /import csv/i }),
      ).toBeVisible();
    });
  },
);
