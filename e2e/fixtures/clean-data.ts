import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from '@/db/schema';
import { test as base, clearWorkerAccountCache } from '~e2e/fixtures/auth';
import { e2eEmail } from '~e2e/fixtures/constants';
import { cleanE2eUserData } from '~test/seed/e2e-cleanup';

type WorkerFixtures = { cleanWorkerUserData: () => Promise<void> };

/**
 * Adds a worker-scoped `cleanWorkerUserData()` that wipes the worker
 * user's transactional rows (imports, ledger accounts, budget periods,
 * categories — FK cascades handle children) inside a transaction, and
 * clears the cached `testAccountName` so the next test using it
 * re-creates the account through the UI. Use in tests that assert
 * empty-state UI.
 */
export const test = base.extend<object, WorkerFixtures>({
  cleanWorkerUserData: [
    async ({}, use, workerInfo) => {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) throw new Error('DATABASE_URL is not set');

      const db = drizzle(databaseUrl, { casing: 'snake_case', schema });
      const email = e2eEmail(workerInfo.parallelIndex);
      try {
        await use(async () => {
          // Clear the cache before the wipe so a mid-wipe failure can't
          // leave a stale account name pointing at a deleted row.
          clearWorkerAccountCache(workerInfo.parallelIndex);
          await cleanE2eUserData(db, email);
        });
      } finally {
        await db.$client.end();
      }
    },
    { scope: 'worker' },
  ],
});

export { expect } from '~e2e/fixtures/auth';
