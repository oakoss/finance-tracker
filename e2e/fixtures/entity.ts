import { expect, type Page, test } from '@playwright/test';

/** Create a ledger account via the accounts page. */
export async function createAccount(page: Page, name: string): Promise<void> {
  await test.step(
    `Create account: ${name}`,
    async () => {
      await page.goto('/accounts');
      await page
        .getByRole('button', { name: /add account/i })
        .first()
        .click();
      await page.getByLabel(/account name/i).fill(name);
      await page.getByRole('button', { name: /create/i }).click();
      await expect(
        page.getByRole('heading', { name: /create account/i }),
      ).toBeHidden();
    },
    { box: true },
  );
}

/** Create an expense category via the categories page. */
export async function createCategory(page: Page, name: string): Promise<void> {
  await test.step(
    `Create category: ${name}`,
    async () => {
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
    },
    { box: true },
  );
}
