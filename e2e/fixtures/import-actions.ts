import { expect, type Page, test } from '@playwright/test';

import { clickRowAction } from '~e2e/fixtures/table-actions';

/** Generate a unique CSV so the file hash differs across projects/runs. */
export function uniqueCsv() {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return [
    'Transaction Date,Post Date,Description,Category,Type,Amount,Memo',
    `01/15/2024,01/16/2024,STARBUCKS #${id},Food & Drink,Sale,-5.75,`,
    '01/16/2024,01/17/2024,AMAZON.COM*ABC123,Shopping,Sale,-42.99,',
    '01/17/2024,01/18/2024,UBER TRIP,Travel,Sale,-18.50,',
  ].join('\n');
}

/** Generate a CSV with valid, error (empty description), and duplicate rows. */
export function uniqueCsvWithErrors() {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return [
    'Date,Description,Amount',
    `01/15/2024,COFFEE SHOP #${id},-5.75`,
    '01/16/2024,,-10.00',
    `01/15/2024,COFFEE SHOP #${id},-5.75`,
  ].join('\n');
}

/** Navigate to import detail page via row action menu. */
export async function navigateToImportDetail(
  page: Page,
  fileName: string,
): Promise<void> {
  await test.step(
    `Navigate to import detail: ${fileName}`,
    async () => {
      const row = page.getByRole('row', { name: new RegExp(fileName, 'i') });
      await clickRowAction(page, row, /review/i);
      await page.waitForURL(/\/imports\//);
      await expect(page.getByText(fileName)).toBeVisible();
    },
    { box: true },
  );
}

/** Upload a CSV through the 2-step import dialog (upload → map columns → import). */
export async function uploadCsv(
  page: Page,
  testAccountName: string,
  fileName: string,
) {
  await test.step(
    `Upload CSV: ${fileName}`,
    async () => {
      await page
        .getByRole('button', { name: /upload csv/i })
        .first()
        .click();
      await expect(
        page.getByRole('heading', { name: /import csv/i }),
      ).toBeVisible();

      // Step 1: select account + file
      await page
        .getByLabel(/account/i)
        .first()
        .click();
      await page
        .getByRole('option', { name: new RegExp(testAccountName, 'i') })
        .click();

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        buffer: Buffer.from(uniqueCsv()),
        mimeType: 'text/csv',
        name: fileName,
      });

      // Step 2: column mapper (auto-detected)
      await page.getByRole('button', { name: /next/i }).click();
      await expect(page.getByText(/amount format/i)).toBeVisible();
      await expect(page.getByText(/preview/i)).toBeVisible();

      // Submit and wait for dialog to close (import succeeded)
      await page.getByRole('button', { name: /^import$/i }).click();
      await expect(
        page.getByRole('heading', { name: /import csv/i }),
      ).toBeHidden({ timeout: 15_000 });
    },
    { box: true },
  );
}
