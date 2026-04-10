import JSZip from 'jszip';

import { expect, test } from '~e2e/fixtures/auth';

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
