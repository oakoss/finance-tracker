import { expect, type Page } from '@playwright/test';

/** Create an expense category via the categories page. */
export async function createCategory(page: Page, name: string): Promise<void> {
  await page.goto('/categories');
  await page
    .getByRole('button', { name: /add category/i })
    .first()
    .click();
  await page.getByLabel(/category name/i).fill(name);
  await page.getByRole('button', { name: /create/i }).click();
  await expect(
    page.getByRole('heading', { name: /create category/i }),
  ).toBeHidden();
}
