import path from 'node:path';

import { expect, test } from '~e2e/fixtures/auth';
import { expectToast, isEmptyState } from '~e2e/fixtures/table-actions';

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

      // Upload CSV file
      const csvPath = path.resolve(
        import.meta.dirname,
        '../fixtures/chase-sample.csv',
      );
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(csvPath);

      // Submit
      await page.getByRole('button', { name: /^import$/i }).click();

      await expectToast(page, /csv imported/i);

      // Verify import appears in the list
      await expect(page.getByText('chase-sample.csv')).toBeVisible();
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
