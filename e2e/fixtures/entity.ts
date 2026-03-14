import type { Page } from '@playwright/test';

import { expectToast } from '~e2e/fixtures/table-actions';

/** Create an expense category via the categories page. */
export async function createCategory(page: Page, name: string): Promise<void> {
  await page.goto('/categories');
  await page
    .getByRole('button', { name: /add category/i })
    .first()
    .click();
  await page.getByLabel(/category name/i).fill(name);
  await page.getByRole('button', { name: /create/i }).click();
  await expectToast(page, 'Category created');
}
