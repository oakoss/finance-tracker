import { expect, test } from '@playwright/test';

import { waitForElementHydration } from '~e2e/fixtures';

test.describe('categories CRUD', { tag: ['@smoke', '@authenticated'] }, () => {
  test('create, edit, and delete a category', async ({ page }) => {
    await page.goto('/categories');
    const heading = page.getByRole('heading', { name: /categories/i });
    await waitForElementHydration(heading);

    // Create category
    await page
      .getByRole('button', { name: /add category/i })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: /create category/i }),
    ).toBeVisible();

    await page.getByLabel(/category name/i).fill('E2E Test Category');
    await page.getByRole('button', { name: /create/i }).click();

    await expect(page.getByText('Category created')).toBeVisible();
    await expect(page.getByText('E2E Test Category')).toBeVisible();

    // Edit category
    const row = page.getByRole('row', {
      name: /E2E Test Category/i,
    });
    await row.getByRole('button', { name: /actions/i }).click();
    await page.getByRole('menuitem', { name: /edit/i }).click();

    await expect(
      page.getByRole('heading', { name: /edit category/i }),
    ).toBeVisible();

    await page.getByLabel(/category name/i).clear();
    await page.getByLabel(/category name/i).fill('E2E Renamed');
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText('Category updated')).toBeVisible();
    await expect(page.getByText('E2E Renamed')).toBeVisible();

    // Delete category
    const updatedRow = page.getByRole('row', {
      name: /E2E Renamed/i,
    });
    await updatedRow.getByRole('button', { name: /actions/i }).click();
    await page.getByRole('menuitem', { name: /delete/i }).click();

    await expect(
      page.getByRole('heading', { name: /delete category/i }),
    ).toBeVisible();

    await page.getByRole('textbox').fill('E2E Renamed');
    await page
      .getByRole('button', { name: /delete/i })
      .last()
      .click();

    await expect(page.getByText('Category deleted')).toBeVisible();
    await expect(page.getByText('E2E Renamed')).toBeHidden();
  });
});
