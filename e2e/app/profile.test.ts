import JSZip from 'jszip';

import { expect, test } from '~e2e/fixtures/auth';
import { e2eEmail } from '~e2e/fixtures/constants';

test.describe('profile page', { tag: ['@smoke', '@authenticated'] }, () => {
  test('view profile and update display name', async ({ page }) => {
    await page.goto('/profile');

    await test.step('verify profile info is visible', async () => {
      await expect(
        page.getByRole('heading', { name: /profile/i }),
      ).toBeVisible();
      await expect(page.getByText(/e2e/i).first()).toBeVisible();
    });

    await test.step('update display name', async () => {
      const nameInput = page.getByLabel(/display name/i);
      await nameInput.clear();
      await nameInput.fill('E2E Updated');
      await page.getByRole('button', { name: /save/i }).first().click();
      await expect(page.getByText('E2E Updated').first()).toBeVisible();
    });

    await test.step('verify name persists after reload', async () => {
      await page.reload();
      await expect(page.getByLabel(/display name/i)).toHaveValue('E2E Updated');
    });

    await test.step('restore original name', async () => {
      const nameInput = page.getByLabel(/display name/i);
      await nameInput.clear();
      await nameInput.fill('E2E Test User');
      await page.getByRole('button', { name: /save/i }).first().click();
      await expect(page.getByText('E2E Test User').first()).toBeVisible();
      await page.reload();
      await expect(page.getByLabel(/display name/i)).toHaveValue(
        'E2E Test User',
      );
    });
  });

  test('export data as CSV ZIP', async ({ page }) => {
    await page.goto('/profile');

    await test.step('click download with CSV format', async () => {
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: /download/i }).click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toBe('finance-tracker-export.zip');

      const buffer = Buffer.from(
        await download.createReadStream().then((stream) => {
          const chunks: Buffer[] = [];
          return new Promise<Buffer>((resolve, reject) => {
            stream.on('data', (chunk: Buffer) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
          });
        }),
      );

      const zip = await JSZip.loadAsync(buffer);
      const fileNames = Object.keys(zip.files);
      expect(fileNames).toContain('accounts.csv');
      expect(fileNames).toContain('transactions.csv');
      expect(fileNames).toContain('categories.csv');
    });
  });

  test('export data as JSON', async ({ page }) => {
    await page.goto('/profile');

    await test.step('select JSON format and download', async () => {
      await page.getByLabel(/format/i).click();
      await page.getByRole('option', { name: /json/i }).click();

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: /download/i }).click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toBe('finance-tracker-export.json');

      const content = await download.createReadStream().then((stream) => {
        const chunks: Buffer[] = [];
        return new Promise<string>((resolve, reject) => {
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('end', () =>
            resolve(Buffer.concat(chunks).toString('utf8')),
          );
          stream.on('error', reject);
        });
      });

      const json = JSON.parse(content);
      expect(json.exportedAt).toBeDefined();
      expect(json.accounts).toBeInstanceOf(Array);
      expect(json.transactions).toBeInstanceOf(Array);
      expect(json.categories).toBeInstanceOf(Array);
    });
  });

  test.describe('account deletion', () => {
    // Leak guard: if the deletion test fails mid-flow, the pending request
    // persists in the DB and poisons every subsequent test in this worker
    // via the grace period banner. Cancel on the way out if it's still there.
    test.afterEach(async ({ page }) => {
      await page.goto('/profile');
      const banner = page.getByText(/account deletion scheduled/i);
      if (await banner.isVisible().catch(() => false)) {
        await page.getByRole('button', { name: /cancel deletion/i }).click();
        await expect(banner).toBeHidden();
      }
    });

    test('initiate and cancel from the banner', async ({
      page,
    }, workerInfo) => {
      const email = e2eEmail(workerInfo.parallelIndex);
      await page.goto('/profile');

      await test.step('open export prompt from danger zone', async () => {
        await page
          .getByRole('button', { name: /delete account/i })
          .first()
          .click();
        await expect(
          page.getByRole('heading', { name: /export your data first/i }),
        ).toBeVisible();
      });

      const confirmDialog = page.getByRole('alertdialog').last();

      await test.step('continue to type-to-confirm dialog', async () => {
        await page.getByRole('button', { name: /continue to delete/i }).click();
        await expect(
          confirmDialog.getByRole('heading', { name: /delete account/i }),
        ).toBeVisible();
      });

      await test.step('type email and confirm', async () => {
        await confirmDialog.getByRole('textbox').fill(email);
        await confirmDialog.getByRole('button', { name: /^delete$/i }).click();
      });

      const banner = page.getByText(/account deletion scheduled/i);

      await test.step('grace period banner appears', async () => {
        await expect(banner).toBeVisible({ timeout: 10_000 });
      });

      await test.step('cancel deletion from banner', async () => {
        await page.getByRole('button', { name: /cancel deletion/i }).click();
        await expect(banner).toBeHidden();
      });
    });
  });

  test('navigate to profile from avatar menu', async ({ page }) => {
    await page.goto('/dashboard');

    await test.step('open avatar menu and click Profile', async () => {
      await page.getByRole('button', { name: /e2e/i }).first().click();
      await page.getByRole('menuitem', { name: /profile/i }).click();
      await expect(page).toHaveURL(/\/profile/);
    });

    await test.step('verify profile page loaded', async () => {
      await expect(
        page.getByRole('heading', { name: /profile/i }),
      ).toBeVisible();
    });
  });
});
