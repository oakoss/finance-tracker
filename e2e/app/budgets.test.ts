import type { Page } from '@playwright/test';

import { expect, test } from '~e2e/fixtures/auth';
import { expectToast } from '~e2e/fixtures/table-actions';

/** Create an expense category via the categories page. */
async function ensureExpenseCategory(page: Page, name: string): Promise<void> {
  await page.goto('/categories');
  await page
    .getByRole('button', { name: /add category/i })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: /create category/i }),
  ).toBeVisible();
  await page.getByLabel(/category name/i).fill(name);
  // Default type is "expense" — no need to change
  await page.getByRole('button', { name: /create/i }).click();
  await expectToast(page, 'Category created');
}

test.describe('budget edit dialog', { tag: ['@authenticated'] }, () => {
  test('create budget via edit dialog and verify persistence', async ({
    page,
  }) => {
    test.slow();

    // Ensure at least 2 expense categories exist for this worker's user
    const cat1 = `E2E Budget Cat A ${Date.now()}`;
    const cat2 = `E2E Budget Cat B ${Date.now()}`;
    await ensureExpenseCategory(page, cat1);
    await ensureExpenseCategory(page, cat2);

    await page.goto('/budgets');

    // Should see empty state initially (no budgets for this month)
    await expect(page.getByText(/no budget|no budgets yet/i)).toBeVisible();

    // Open edit budget dialog
    await page.getByRole('button', { name: /edit budget/i }).click();
    await expect(
      page.getByRole('heading', { name: /edit budget/i }),
    ).toBeVisible();

    // Locators for the two category inputs (lazy, safe across reopens)
    const input1 = page.getByRole('spinbutton', { name: cat1 });
    const input2 = page.getByRole('spinbutton', { name: cat2 });

    // Fill amounts for the 2 categories
    await expect(input1).toBeVisible();
    await input1.fill('150.00');
    await input2.fill('75.50');

    // Save
    await page.getByRole('button', { name: /save/i }).click();
    await expectToast(page, /budget saved/i);

    // Verify budget overview renders with summary
    await expect(page.getByText('Budgeted')).toBeVisible();
    await expect(page.getByText('$225.50').first()).toBeVisible();

    // Reopen edit dialog and verify values persisted
    await page.getByRole('button', { name: /edit budget/i }).click();
    await expect(input1).toBeVisible();
    await expect(input1).toHaveValue('150.00');
    await expect(input2).toHaveValue('75.50');

    // --- Update flow: change cat1 amount, clear cat2 (delete) ---
    await input1.fill('200.00');
    await input2.fill('');

    await page.getByRole('button', { name: /save/i }).click();
    await expectToast(page, /budget saved/i);

    // Verify overview updated: only cat1 remains at $200
    await expect(page.getByText('$200.00').first()).toBeVisible();

    // Reopen and verify: cat1 updated, cat2 cleared
    await page.getByRole('button', { name: /edit budget/i }).click();
    await expect(input1).toBeVisible();
    await expect(input1).toHaveValue('200.00');
    await expect(input2).toHaveValue('');
  });
});
