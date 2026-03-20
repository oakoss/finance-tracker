import { test as base, expect } from '@playwright/test';

import { waitForHydration } from '~e2e/fixtures';
import {
  E2E_PASSWORD,
  E2E_USER_COUNT,
  e2eEmail,
} from '~e2e/fixtures/constants';

/**
 * Module-level account cache keyed on `parallelIndex`. The account is
 * created on the first test that requests it within a worker process;
 * subsequent tests skip creation and reuse the cached name. A `null`
 * entry means creation failed — subsequent tests get a clear error.
 */
const workerAccountNames = new Map<number, string | null>();

/**
 * Auth fixture bundle. Provides `workerStorageState` (worker-scoped:
 * per-worker login and session persistence) and `testAccountName`
 * (test-scoped with module-level cache: lazily-created account for
 * transaction tests).
 */
export const test = base.extend<
  { testAccountName: string },
  { workerStorageState: string }
>({
  page: async ({ page }, use) => {
    const originalGoto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const response = await originalGoto(url, options);
      await waitForHydration(page);
      return response;
    };
    await use(page);
  },

  storageState: ({ workerStorageState }, use) => use(workerStorageState),

  testAccountName: async ({ page }, use, workerInfo) => {
    const id = workerInfo.parallelIndex;
    const cached = workerAccountNames.get(id);

    if (cached === null) {
      throw new Error(
        `Worker ${id} account creation failed in a previous test. ` +
          'Remaining tests in this worker cannot proceed.',
      );
    }

    if (cached === undefined) {
      const name = `E2E W${id} Acct ${Date.now()}`;
      try {
        await page.goto('/accounts');
        await page
          .getByRole('button', { name: /add account/i })
          .first()
          .click();
        await page.getByLabel(/account name/i).fill(name);
        await page.getByRole('button', { name: /create/i }).click();
        await expect(
          page.getByRole('heading', { name: /create account/i }),
        ).toBeHidden();
        workerAccountNames.set(id, name);
      } catch (error) {
        workerAccountNames.set(id, null);
        throw error;
      }
    }

    await use(workerAccountNames.get(id)!);
  },

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
