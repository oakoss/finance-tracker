import { type Page, test } from '@playwright/test';

import { getField } from '~e2e/fixtures/field';

/** Type into a combobox field and select the "Create ..." option. */
export async function createViaCombobox(
  page: Page,
  fieldLabel: string,
  value: string,
): Promise<void> {
  await test.step(
    `Create via combobox: ${fieldLabel} = ${value}`,
    async () => {
      const input = getField(page, fieldLabel).getByRole('combobox');
      await input.click();
      await input.pressSequentially(value, { delay: 50 });
      await page
        .getByRole('option', { name: new RegExp(`Create "${value}"`, 'i') })
        .click();
    },
    { box: true },
  );
}

/** Type into a combobox field and select an existing option. */
export async function selectExistingCombobox(
  page: Page,
  fieldLabel: string,
  value: string,
): Promise<void> {
  await test.step(
    `Select existing combobox: ${fieldLabel} = ${value}`,
    async () => {
      const input = getField(page, fieldLabel).getByRole('combobox');
      await input.click();
      await input.pressSequentially(value, { delay: 50 });
      await page.getByRole('option', { exact: true, name: value }).click();
    },
    { box: true },
  );
}
