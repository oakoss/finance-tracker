import path from 'node:path';

import { expect, test } from '~e2e/fixtures/auth';
import { expectToast } from '~e2e/fixtures/table-actions';

test.describe('imports stress', { tag: ['@stress', '@authenticated'] }, () => {
  test('upload 1500-row CSV completes within 30s', async ({
    page,
    testAccountName,
  }) => {
    test.slow();

    await page.goto('/imports');

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

    // Upload large CSV
    const csvPath = path.resolve(
      import.meta.dirname,
      '../fixtures/large-import.csv',
    );
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Submit and time it
    const start = Date.now();
    await page.getByRole('button', { name: /^import$/i }).click();
    await expectToast(page, /csv imported/i);
    const elapsed = Date.now() - start;

    // Verify it completed with correct row count
    await expect(page.getByText('large-import.csv')).toBeVisible();
    await expect(page.getByText('1500')).toBeVisible();

    console.log(`Large CSV import took ${elapsed}ms`);
    expect(elapsed).toBeLessThan(30_000);
  });
});
