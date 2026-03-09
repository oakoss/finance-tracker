import { test as base, expect } from '@playwright/test';

import {
  E2E_PASSWORD,
  E2E_USER_COUNT,
  e2eEmail,
} from '~e2e/fixtures/constants';

/**
 * Worker-scoped auth fixture. Each Playwright worker logs in as its
 * own E2E user (`e2e-worker-{parallelIndex}@test.local`) and saves
 * the storageState to a per-worker file. This isolates server-side
 * data between parallel workers.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Playwright fixture pattern: no test-scoped additions
export const test = base.extend<{}, { workerStorageState: string }>({
  storageState: ({ workerStorageState }, use) => use(workerStorageState),

  workerStorageState: [
    async ({ browser }, use, workerInfo) => {
      const id = workerInfo.parallelIndex;

      if (id >= E2E_USER_COUNT) {
        throw new Error(
          `Worker ${id} exceeds E2E_USER_COUNT (${E2E_USER_COUNT}). ` +
            'Increase E2E_USER_COUNT in e2e/fixtures/constants.ts and re-run db-setup.',
        );
      }

      const authFile = `playwright/.auth/worker-${id}.json`;

      const baseURL = workerInfo.project.use.baseURL;
      const context = await browser.newContext(baseURL ? { baseURL } : {});
      try {
        const page = await context.newPage();

        await page.goto('/sign-in');
        await expect(
          page.getByRole('button', { name: 'Sign in' }),
        ).toBeEnabled();
        await page.getByLabel('Email').fill(e2eEmail(id));
        await page.getByLabel('Password', { exact: true }).fill(E2E_PASSWORD);
        await page.getByRole('button', { name: 'Sign in' }).click();

        await expect(page).toHaveURL('/dashboard', { timeout: 15_000 });
        await expect(
          page.getByRole('heading', { name: /welcome/i }),
        ).toBeVisible();

        await context.storageState({ path: authFile });
      } finally {
        await context.close();
      }

      await use(authFile);
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
