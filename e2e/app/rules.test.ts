import { expect, test } from '~e2e/fixtures/auth';
import { createCategory } from '~e2e/fixtures/entity';

test.describe(
  'merchant rules CRUD',
  { tag: ['@smoke', '@authenticated', '@mobile', '@tablet'] },
  () => {
    test('create, toggle, edit, and delete a rule', async ({ page }) => {
      test.slow();
      const categoryName = `E2E Rule Cat ${Date.now()}`;
      const matchValue = `e2e-rule-${Date.now()}`;
      const renamedMatch = `${matchValue}-renamed`;

      await createCategory(page, categoryName);

      await test.step('navigate to rules page', async () => {
        await page.goto('/rules');
        await expect(
          page.getByRole('heading', { name: /rules/i }),
        ).toBeVisible();
      });

      await test.step('create a rule', async () => {
        await page
          .getByRole('button', { name: /new rule/i })
          .first()
          .click();
        const dialog = page.getByRole('dialog');
        await expect(
          dialog.getByRole('heading', { name: /new rule/i }),
        ).toBeVisible();

        await dialog.getByLabel(/match value/i).fill(matchValue);

        await dialog.getByRole('button', { name: /add action/i }).click();
        await page
          .getByRole('menuitem', { name: /set category/i })
          .or(page.getByRole('button', { name: /^set category$/i }))
          .click();

        await dialog.getByLabel(/^set category$/i).click();
        await page.getByRole('option', { name: categoryName }).click();

        await dialog.getByRole('button', { name: /^create$/i }).click();
        await expect(dialog).toBeHidden();
        await expect(
          page.getByRole('listitem', { name: new RegExp(matchValue) }),
        ).toBeVisible();
      });

      await test.step('toggle rule inactive, then active, reload to verify persistence', async () => {
        const row = page.getByRole('listitem', {
          name: new RegExp(matchValue),
        });
        const toggle = row.getByRole('switch', { name: /^active$/i });

        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-checked', 'false');

        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-checked', 'true');

        await page.reload();
        const reloadedToggle = page
          .getByRole('listitem', { name: new RegExp(matchValue) })
          .getByRole('switch', { name: /^active$/i });
        await expect(reloadedToggle).toHaveAttribute('aria-checked', 'true');
      });

      await test.step('edit the rule match value', async () => {
        const row = page.getByRole('listitem', {
          name: new RegExp(matchValue),
        });
        await row.getByRole('button', { name: /rule actions/i }).click();
        await page.getByRole('menuitem', { name: /edit/i }).click();

        const dialog = page.getByRole('dialog');
        await expect(
          dialog.getByRole('heading', { name: /edit rule/i }),
        ).toBeVisible();

        await dialog.getByLabel(/match value/i).fill(renamedMatch);
        await dialog.getByRole('button', { name: /save/i }).click();

        await expect(dialog).toBeHidden();
        await expect(
          page.getByRole('listitem', { name: new RegExp(renamedMatch) }),
        ).toBeVisible();
        await expect(
          page.getByRole('listitem', {
            name: new RegExp(`^Contains: ${matchValue}$`),
          }),
        ).toHaveCount(0);
      });

      await test.step('delete the rule', async () => {
        const row = page.getByRole('listitem', {
          name: new RegExp(renamedMatch),
        });
        await row.getByRole('button', { name: /rule actions/i }).click();
        await page.getByRole('menuitem', { name: /delete/i }).click();

        const dialog = page.getByRole('alertdialog');
        await expect(
          dialog.getByRole('heading', { name: /delete rule/i }),
        ).toBeVisible();

        const confirmButton = dialog.getByRole('button', { name: /^delete$/i });
        await dialog.getByRole('textbox').fill(`Contains: ${renamedMatch}`);
        await expect(confirmButton).toBeEnabled();
        await confirmButton.click();

        await expect(dialog).toBeHidden();
        await expect(
          page.getByRole('listitem', { name: new RegExp(renamedMatch) }),
        ).toHaveCount(0);
      });
    });
  },
);
