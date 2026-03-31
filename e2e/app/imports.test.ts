import { expect, test } from '~e2e/fixtures/auth';
import {
  navigateToImportDetail,
  uniqueCsvWithErrors,
  uploadCsv,
} from '~e2e/fixtures/import-actions';
import {
  clickRowAction,
  confirmDelete,
  isEmptyState,
} from '~e2e/fixtures/table-actions';

test.describe(
  'imports CSV upload',
  { tag: ['@smoke', '@authenticated', '@mobile'] },
  () => {
    test('upload CSV happy path', async ({ page, testAccountName }) => {
      test.slow();

      await page.goto('/imports');

      const fileName = `import-${Date.now()}.csv`;
      await uploadCsv(page, testAccountName, fileName);

      // Verify import appears in the list
      await expect(page.getByText(fileName)).toBeVisible();
    });

    test('delete import via row action', async ({ page, testAccountName }) => {
      test.slow();

      await page.goto('/imports');

      const fileName = `delete-${Date.now()}.csv`;
      await uploadCsv(page, testAccountName, fileName);

      // Delete it
      const row = page.getByRole('row', { name: new RegExp(fileName, 'i') });
      await clickRowAction(page, row, /delete/i);
      await confirmDelete(page, fileName);

      // Wait for delete dialog to close, then verify row is gone
      await expect(
        page.getByRole('heading', { name: /delete import/i }),
      ).toBeHidden();
      await expect(page.getByRole('table').getByText(fileName)).toBeHidden();
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

test.describe(
  'imports review + commit',
  { tag: ['@smoke', '@authenticated', '@mobile'] },
  () => {
    test('full import → review → commit flow', async ({
      page,
      testAccountName,
    }) => {
      test.slow();

      await page.goto('/imports');

      const fileName = `review-${Date.now()}.csv`;
      await uploadCsv(page, testAccountName, fileName);

      await test.step('navigate to detail page', async () => {
        await navigateToImportDetail(page, fileName);
      });

      await test.step('verify row table with mapped rows', async () => {
        const table = page.getByRole('table');
        await expect(table).toBeVisible();
        await expect(
          table.getByRole('cell', { name: /^mapped$/i }).first(),
        ).toBeVisible();
      });

      await test.step('toggle row to ignored and back', async () => {
        const table = page.getByRole('table');
        const ignoreBtn = page.getByRole('button', { name: /ignore/i }).first();
        await ignoreBtn.click();
        await expect(
          table.getByRole('cell', { name: /^ignored$/i }).first(),
        ).toBeVisible();

        const mapBtn = page.getByRole('button', { name: /^map$/i }).first();
        await mapBtn.click();
        await expect(
          table.getByRole('cell', { name: /^mapped$/i }).first(),
        ).toBeVisible();
      });

      await test.step('edit a cell via click-to-edit', async () => {
        const editBtn = page
          .getByRole('button', { name: /starbucks/i })
          .first();
        await editBtn.click();
        // Input appears in the same cell — use page-scoped locator
        // since the row name changes after fill
        const input = page.getByRole('textbox').first();
        await expect(input).toBeFocused();
        await input.fill('EDITED COFFEE');
        await page.keyboard.press('Enter');
        await expect(
          page.getByRole('button', { name: /edited coffee/i }).first(),
        ).toBeVisible();
      });

      await test.step('commit import', async () => {
        const commitBtn = page.getByRole('button', { name: /commit import/i });
        await expect(commitBtn).toBeEnabled();
        await commitBtn.click();

        // Wait for commit to complete — button becomes disabled
        await expect(commitBtn).toBeDisabled({ timeout: 15_000 });

        // Verify rows show committed status in table cells
        await expect(
          page.getByRole('cell', { name: /^committed$/i }).first(),
        ).toBeVisible();
      });

      await test.step('committed rows are not editable', async () => {
        const descCell = page
          .getByRole('cell', { name: /edited coffee/i })
          .first();
        await expect(descCell.getByRole('button')).toHaveCount(0);
      });

      await test.step('verify transactions were created', async () => {
        await page.goto('/transactions');
        await expect(page.getByRole('table')).toBeVisible();
        await expect(
          page.getByRole('cell', { name: /edited coffee/i }).first(),
        ).toBeVisible();
      });
    });

    test('error and duplicate rows display correctly', async ({
      page,
      testAccountName,
    }) => {
      test.slow();

      await page.goto('/imports');

      const fileName = `errors-${Date.now()}.csv`;
      await uploadCsv(page, testAccountName, fileName, uniqueCsvWithErrors());

      await test.step('navigate to detail and verify statuses', async () => {
        await navigateToImportDetail(page, fileName);

        const table = page.getByRole('table');
        await expect(
          table.getByRole('cell', { name: /^mapped$/i }).first(),
        ).toBeVisible();
        await expect(
          table.getByRole('cell', { name: /^error/i }).first(),
        ).toBeVisible();
        await expect(
          table.getByRole('cell', { name: /^duplicate$/i }).first(),
        ).toBeVisible();
      });

      await test.step('toggle hidden for error and duplicate rows', async () => {
        const table = page.getByRole('table');
        const errorRow = table
          .getByRole('row')
          .filter({ has: table.getByRole('cell', { name: /^error/i }) });
        await expect(
          errorRow.getByRole('button', { name: /ignore/i }),
        ).toHaveCount(0);
        const dupeRow = table
          .getByRole('row')
          .filter({ has: table.getByRole('cell', { name: /^duplicate$/i }) });
        await expect(
          dupeRow.getByRole('button', { name: /ignore/i }),
        ).toHaveCount(0);
      });
    });

    test('invalid amount edit does not save', async ({
      page,
      testAccountName,
    }) => {
      test.slow();

      await page.goto('/imports');

      const fileName = `amount-${Date.now()}.csv`;
      await uploadCsv(page, testAccountName, fileName);
      await navigateToImportDetail(page, fileName);

      await test.step('edit amount with non-numeric value', async () => {
        const row = page.getByRole('row', { name: /starbucks/i }).first();
        await row.getByRole('button', { name: /-5\.75/i }).click();
        const input = row.getByRole('textbox');
        await input.fill('not-a-number');
        await input.press('Enter');

        // Cell should revert to original value
        await expect(
          row.getByRole('button', { name: /-5\.75/i }),
        ).toBeVisible();
      });
    });

    test('navigation: back link returns to list', async ({
      page,
      testAccountName,
    }) => {
      test.slow();

      await page.goto('/imports');

      const fileName = `nav-${Date.now()}.csv`;
      await uploadCsv(page, testAccountName, fileName);
      await navigateToImportDetail(page, fileName);

      await test.step('click back link', async () => {
        await page.getByRole('link', { name: /back to imports/i }).click();
        await page.waitForURL('/imports');
        await expect(page.getByText(fileName)).toBeVisible();
      });
    });
  },
);
