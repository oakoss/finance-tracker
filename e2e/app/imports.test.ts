import { expect, test } from '~e2e/fixtures/auth';
import { uploadCsv } from '~e2e/fixtures/import-actions';
import {
  clickRowAction,
  confirmDelete,
  expectToast,
  isEmptyState,
} from '~e2e/fixtures/table-actions';

test.describe(
  'imports CSV upload',
  { tag: ['@smoke', '@authenticated', '@mobile'] },
  () => {
    test('upload CSV happy path', async ({ page, testAccountName }) => {
      test.slow();

      await page.goto('/imports');

      const fileName = 'chase-sample.csv';
      await uploadCsv(page, testAccountName, fileName);

      // Verify import appears in the list
      await expect(page.getByText(fileName)).toBeVisible();
    });

    test('delete import via row action', async ({ page, testAccountName }) => {
      test.slow();

      await page.goto('/imports');

      const fileName = 'delete-test.csv';
      await uploadCsv(page, testAccountName, fileName);

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
