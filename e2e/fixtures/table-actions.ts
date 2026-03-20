import { expect, type Locator, type Page } from '@playwright/test';

/** Click a row's actions menu and select a menu item. */
export async function clickRowAction(
  page: Page,
  row: Locator,
  action: RegExp,
): Promise<void> {
  const actionsBtn = row.getByRole('button', { name: /actions/i });
  await actionsBtn.scrollIntoViewIfNeeded();
  await expect(actionsBtn).toBeInViewport();
  await actionsBtn.click();
  await page.getByRole('menuitem', { name: action }).click();
}

/** Find a row by text, click edit action, and assert the edit heading. */
export async function openEditDialog(
  page: Page,
  rowText: string,
  editHeading: RegExp,
): Promise<void> {
  const row = page.getByRole('row', { name: new RegExp(rowText, 'i') });
  await clickRowAction(page, row, /edit/i);
  await expect(page.getByRole('heading', { name: editHeading })).toBeVisible();
}

/** Fill the type-to-confirm input and click the delete button. */
export async function confirmDelete(
  page: Page,
  confirmText: string,
): Promise<void> {
  await page.getByRole('textbox').fill(confirmText);
  await page
    .getByRole('button', { name: /delete/i })
    .last()
    .click();
}

/**
 * Check whether an empty-state message is visible.
 * Returns false (instead of throwing) on timeout.
 */
export async function isEmptyState(page: Page, text: RegExp): Promise<boolean> {
  return page
    .getByText(text)
    .isVisible({ timeout: 3000 })
    .catch((error: Error) => {
      if (error.name === 'TimeoutError' || error.message.includes('Timeout'))
        return false;
      throw error;
    });
}
