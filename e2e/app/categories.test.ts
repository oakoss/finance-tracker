import { expect, test } from '@playwright/test';

import { clickRowAction, confirmDelete } from '~e2e/fixtures/table-actions';

test.describe('categories CRUD', { tag: ['@smoke', '@authenticated'] }, () => {
  test('create, edit, and delete a category', async ({ page }) => {
    const name = `E2E Cat ${Date.now()}`;
    const renamed = `${name} Renamed`;

    await page.goto('/categories');

    // Create category
    await page
      .getByRole('button', { name: /add category/i })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: /create category/i }),
    ).toBeVisible();

    await page.getByLabel(/category name/i).fill(name);
    await page.getByRole('button', { name: /create/i }).click();

    await expect(page.getByText('Category created')).toBeVisible();
    await expect(page.getByText(name)).toBeVisible();

    // Edit category
    const row = page.getByRole('row', { name: new RegExp(name, 'i') });
    await clickRowAction(page, row, /edit/i);

    await expect(
      page.getByRole('heading', { name: /edit category/i }),
    ).toBeVisible();

    await page.getByLabel(/category name/i).clear();
    await page.getByLabel(/category name/i).fill(renamed);
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText('Category updated')).toBeVisible();
    await expect(page.getByText(renamed)).toBeVisible();

    // Delete category
    const updatedRow = page.getByRole('row', {
      name: new RegExp(renamed, 'i'),
    });
    await clickRowAction(page, updatedRow, /delete/i);

    await expect(
      page.getByRole('heading', { name: /delete category/i }),
    ).toBeVisible();

    await confirmDelete(page, renamed);

    await expect(page.getByText('Category deleted')).toBeVisible();
    await expect(page.getByRole('table').getByText(renamed)).toBeHidden();
  });
});
