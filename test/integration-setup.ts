import { sql } from 'drizzle-orm';
import { test as base } from 'vitest';

import { createTestDb } from '~test/db';
import type { Db } from '~test/factories/base';

type IntegrationFixtures = {
  db: Db;
  fileDb: Db;
};

/**
 * Vitest fixtures for transaction-isolated integration tests.
 *
 * - `fileDb` (file-scoped): one connection wrapped in BEGIN/ROLLBACK.
 * - `db` (test-scoped): SAVEPOINT per test, rolled back after each.
 *
 * Usage:
 *   import { test } from '~test/integration-setup';
 *   test('inserts a user', async ({ db }) => { ... });
 */
export const test = base.extend<IntegrationFixtures>({
  // File-scoped: one connection + transaction per test file
  fileDb: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const db = await createTestDb();
      await db.execute(sql`BEGIN`);
      try {
        await use(db);
      } finally {
        try {
          await db.execute(sql`ROLLBACK`);
        } catch (error: unknown) {
          console.warn('[fileDb] ROLLBACK failed:', error);
        }
        await db.$client.end().catch((error: unknown) => {
          console.warn('[fileDb] Failed to close connection:', error);
        });
      }
    },
    { scope: 'file' },
  ],

  // Test-scoped: savepoint per test
  db: async ({ fileDb }, use) => {
    await fileDb.execute(sql`SAVEPOINT test_sp`);
    try {
      await use(fileDb);
    } finally {
      try {
        await fileDb.execute(sql`ROLLBACK TO SAVEPOINT test_sp`);
      } catch (error: unknown) {
        console.warn('[test] ROLLBACK TO SAVEPOINT failed:', error);
        try {
          await fileDb.execute(sql`ROLLBACK`);
          await fileDb.execute(sql`BEGIN`);
        } catch (recoveryError: unknown) {
          console.warn('[test] Transaction recovery failed:', recoveryError);
        }
      }
    }
  },
});
