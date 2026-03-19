import { expect, test } from '~e2e/fixtures/auth';
import { createCategory } from '~e2e/fixtures/entity';
import { expectToast } from '~e2e/fixtures/table-actions';

test.describe('budget edit dialog', { tag: ['@authenticated'] }, () => {
  test('create budget via edit dialog and verify persistence', async ({
    page,
  }) => {
    test.slow();

    // Ensure at least 2 expense categories exist for this worker's user
    const cat1 = `E2E Budget Cat A ${Date.now()}`;
    const cat2 = `E2E Budget Cat B ${Date.now()}`;
    await createCategory(page, cat1);
    await createCategory(page, cat2);

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

    // Wait for both category inputs to render (async dialog content)
    await expect(async () => {
      await expect(input1).toBeVisible();
      await expect(input2).toBeVisible();
    }).toPass({ timeout: 10_000 });

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
