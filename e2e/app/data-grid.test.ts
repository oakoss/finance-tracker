import { expect, test } from '~e2e/fixtures/auth';

// Pinning renders through `data-pinned` / `data-last-col`, which Tailwind
// arbitrary-variant selectors match literally — renaming either side stops the
// sticky styles applying without failing typecheck.
//
// The offsets are set with logical properties, so the physical `left`/`right`
// assertions below hold only while the app is LTR. Under RTL they swap; assert
// `insetInlineStart`/`insetInlineEnd` rather than reverting the implementation.
test.describe(
  'data grid column pinning',
  { tag: ['@authenticated', '@mobile'] },
  () => {
    test('pins the first and last columns to the row edges', async ({
      page,
      testAccountName,
    }) => {
      await test.step('open the accounts grid with at least one row', async () => {
        await page.goto('/accounts');
        await expect(page.getByRole('table')).toBeVisible();
        await expect(page.getByText(testAccountName)).toBeVisible();
      });

      await test.step('start-pinned header sticks to the leading edge', async () => {
        const nameHeader = page.getByRole('columnheader', { name: 'Name' });

        await expect(nameHeader).toHaveAttribute('data-pinned', 'start');
        await expect(nameHeader).toHaveAttribute('data-last-col', 'start');
        await expect
          .poll(() =>
            nameHeader.evaluate((el) => getComputedStyle(el).position),
          )
          .toBe('sticky');
        await expect
          .poll(() => nameHeader.evaluate((el) => getComputedStyle(el).left))
          .toBe('0px');
      });

      await test.step('end-pinned header sticks to the trailing edge', async () => {
        // The actions column is a display column with no header text, so it is
        // addressable only by position — which the pinning config fixes as last.
        const actionsHeader = page.getByRole('columnheader').last();

        await expect(actionsHeader).toHaveAttribute('data-pinned', 'end');
        await expect(actionsHeader).toHaveAttribute('data-last-col', 'end');
        await expect
          .poll(() =>
            actionsHeader.evaluate((el) => getComputedStyle(el).right),
          )
          .toBe('0px');
      });

      await test.step('body cells carry the same pinning as their headers', async () => {
        const row = page.getByRole('row').filter({ hasText: testAccountName });

        await expect(row.getByRole('cell').first()).toHaveAttribute(
          'data-pinned',
          'start',
        );
        await expect(row.getByRole('cell').last()).toHaveAttribute(
          'data-pinned',
          'end',
        );
      });
    });
  },
);
