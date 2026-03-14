import type { Page } from '@playwright/test';

import { getField } from '~e2e/fixtures/field';

/** Type into a combobox field and select the "Create ..." option. */
export async function createViaCombobox(
  page: Page,
  fieldLabel: string,
  value: string,
): Promise<void> {
  const input = getField(page, fieldLabel).getByRole('combobox');
  await input.click();
  await input.pressSequentially(value, { delay: 50 });
  await page
    .getByRole('option', { name: new RegExp(`Create "${value}"`, 'i') })
    .click();
}

/** Type into a combobox field and select an existing option. */
export async function selectExistingCombobox(
  page: Page,
  fieldLabel: string,
  value: string,
): Promise<void> {
  const input = getField(page, fieldLabel).getByRole('combobox');
  await input.click();
  await input.pressSequentially(value, { delay: 50 });
  await page.getByRole('option', { exact: true, name: value }).click();
}
