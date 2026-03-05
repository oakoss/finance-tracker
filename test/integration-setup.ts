import { sql } from 'drizzle-orm';
import { test as base } from 'vitest';

import type { Db } from '~test/factories/base';

import { createTestDb } from '~test/db';

/** Thrown to force Drizzle to ROLLBACK instead of COMMIT. */
class RollbackOnPurpose extends Error {}

type IntegrationFixtures = {
  db: Db;
  fileDb: Db;
  serviceDb: Db;
};

/**
 * Vitest fixtures for transaction-isolated integration tests.
 *
 * - `fileDb` (file-scoped): Drizzle-managed transaction, rolled back
 *   after all tests in the file complete. Using Drizzle's `.transaction()`
 *   means nested `.transaction()` calls automatically use SAVEPOINTs.
 * - `db` (test-scoped): SAVEPOINT per test, rolled back after each.
 * - `serviceDb` (test-scoped): wraps `db` in a Drizzle transaction so
 *   services' internal `.transaction()` calls become savepoints.
 *
 * Usage:
 *   import { test } from '~test/integration-setup';
 *   test('inserts a user', async ({ db }) => { ... });
 *   test('creates transaction via service', async ({ serviceDb }) => { ... });
 */
export const test = base.extend<IntegrationFixtures>({
  // Test-scoped: savepoint per test
  db: async ({ fileDb }, use) => {
    await fileDb.execute(sql`SAVEPOINT test_sp`);
    try {
      await use(fileDb);
    } finally {
      try {
        await fileDb.execute(sql`ROLLBACK TO SAVEPOINT test_sp`);
      } catch (error: unknown) {
        // Aborted state cascades — all remaining tests in this file will fail.
        console.error('[test] ROLLBACK TO SAVEPOINT failed:', error);
      }
    }
  },
  // File-scoped: one connection + Drizzle-managed transaction per file.
  // Thrown RollbackOnPurpose forces ROLLBACK instead of COMMIT.
  fileDb: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const rawDb = await createTestDb();
      try {
        await rawDb.transaction(async (tx) => {
          await use(tx as unknown as Db);
          throw new RollbackOnPurpose();
        });
      } catch (error: unknown) {
        if (!(error instanceof RollbackOnPurpose)) throw error;
      } finally {
        await rawDb.$client.end().catch((error: unknown) => {
          console.warn('[fileDb] Failed to close connection:', error);
        });
      }
    },
    { scope: 'file' },
  ],
  // Test-scoped: wraps db in a Drizzle transaction so services'
  // internal .transaction() calls become savepoints instead of
  // real BEGIN/COMMIT that would break fixture isolation.
  serviceDb: async ({ db }, use) => {
    await db.transaction(async (tx) => {
      await use(tx as unknown as Db);
    });
  },
});
