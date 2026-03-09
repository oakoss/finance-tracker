import type { Locator, Page } from '@playwright/test';

/** Click a row's actions menu and select a menu item. */
export async function clickRowAction(
  page: Page,
  row: Locator,
  action: RegExp,
): Promise<void> {
  await row.getByRole('button', { name: /actions/i }).click();
  await page.getByRole('menuitem', { name: action }).click();
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

/** Dismiss the first visible toast notification. */
export async function dismissToast(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: /close toast/i })
    .first()
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
