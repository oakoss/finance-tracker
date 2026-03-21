import { type Page, test } from '@playwright/test';

/** Open the Account select and pick the option by name. */
export async function selectAccount(
  page: Page,
  accountName: string,
): Promise<void> {
  await test.step(
    `Select account: ${accountName}`,
    async () => {
      await page.getByLabel('Account').click();
      const option = page
        .getByRole('option', { name: new RegExp(accountName, 'i') })
        .first();
      await option.scrollIntoViewIfNeeded();
      await option.click();
    },
    { box: true },
  );
}
