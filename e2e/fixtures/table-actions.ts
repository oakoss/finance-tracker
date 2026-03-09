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
 * Assert a Sonner toast appeared with the given text, then dismiss it.
 * Tolerates the toast auto-dismissing before the close button can be clicked.
 */
export async function expectToast(
  page: Page,
  text: string | RegExp,
): Promise<void> {
  const toast = page.locator('[data-sonner-toast]').filter({ hasText: text });
  await expect(toast).toBeVisible();

  const closeBtn = toast.locator('[data-close-button]');
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
  }

  await toast
    .waitFor({ state: 'hidden', timeout: 3000 })
    .catch((error: Error) => {
      if (error.name !== 'TimeoutError') throw error;
    });
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
