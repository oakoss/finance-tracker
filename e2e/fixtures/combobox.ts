import type { Page } from '@playwright/test';

/** Type into a combobox field and select the "Create ..." option. */
export async function createViaCombobox(
  page: Page,
  fieldLabel: string,
  value: string,
): Promise<void> {
  const field = page
    .locator('[data-slot="field"]')
    .filter({ has: page.getByText(fieldLabel, { exact: true }) });
  const input = field.getByRole('combobox');
  await input.click();
  await input.pressSequentially(value, { delay: 50 });
  await page
    .getByRole('option', { name: new RegExp(`Create "${value}"`, 'i') })
    .click();
}
