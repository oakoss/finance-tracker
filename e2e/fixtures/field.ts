import type { Locator, Page } from '@playwright/test';

/** Locate a form field by its visible label using `data-slot="field"`. */
export function getField(page: Page, label: string): Locator {
  return page
    .locator('[data-slot="field"]')
    .filter({ has: page.getByText(label, { exact: true }) });
}
