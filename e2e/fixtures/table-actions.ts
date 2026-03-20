import { expect, type Locator, type Page, test } from '@playwright/test';

/** Click a row's actions menu and select a menu item. */
export async function clickRowAction(
  page: Page,
  row: Locator,
  action: RegExp,
): Promise<void> {
  await test.step(
    `Click row action: ${action}`,
    async () => {
      const actionsBtn = row.getByRole('button', { name: /actions/i });
      await actionsBtn.scrollIntoViewIfNeeded();
      await expect(actionsBtn).toBeInViewport();
      await actionsBtn.click();
      await page.getByRole('menuitem', { name: action }).click();
    },
    { box: true },
  );
}

/** Find a row by text, click edit action, and assert the edit heading. */
export async function openEditDialog(
  page: Page,
  rowText: string,
  editHeading: RegExp,
): Promise<void> {
  await test.step(
    `Open edit dialog: ${rowText}`,
    async () => {
      const row = page.getByRole('row', { name: new RegExp(rowText, 'i') });
      await clickRowAction(page, row, /edit/i);
      await expect(
        page.getByRole('heading', { name: editHeading }),
      ).toBeVisible();
    },
    { box: true },
  );
}

/** Fill the type-to-confirm input and click the delete button. */
export async function confirmDelete(
  page: Page,
  confirmText: string,
): Promise<void> {
  await test.step(
    `Confirm delete: ${confirmText}`,
    async () => {
      await page.getByRole('textbox').fill(confirmText);
      await page
        .getByRole('button', { name: /delete/i })
        .last()
        .click();
    },
    { box: true },
  );
}

/**
 * Check whether an empty-state message is visible.
 * Returns false if the element does not appear within 3 seconds.
 */
export async function isEmptyState(page: Page, text: RegExp): Promise<boolean> {
  return page
    .getByText(text)
    .waitFor({ state: 'visible', timeout: 3000 })
    .then(() => true)
    .catch(() => false);
}
