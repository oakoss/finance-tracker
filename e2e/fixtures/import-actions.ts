import { expect, type Page, test } from '@playwright/test';

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
