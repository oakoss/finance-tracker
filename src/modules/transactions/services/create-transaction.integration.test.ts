import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { transactionTags } from '@/modules/transactions/db/schema';
import { createTransactionService } from '@/modules/transactions/services/create-transaction';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import type { Db as TestDb } from '~test/factories/base';
import { insertCategory } from '~test/factories/category.factory';
import { insertPayee } from '~test/factories/payee.factory';
import { insertTag } from '~test/factories/tag.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

/**
 * Cast test Db to app Db. Safe because PgTransaction extends PgDatabase
 * at runtime — all query/mutation methods are available.
 */
const asDb = (db: TestDb) => db as unknown as Db;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validCreateInput(
  accountId: string,
  overrides?: Record<string, unknown>,
) {
  return {
    accountId,
    amountCents: 5000,
    description: 'Test transaction',
    transactionAt: '2024-06-15',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createTransactionService
// ---------------------------------------------------------------------------

test('create — inserts transaction with valid data', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const payee = await insertPayee(serviceDb, { userId: user.id });
  const tag = await insertTag(serviceDb, { userId: user.id });

  const result = await createTransactionService(
    asDb(serviceDb),
    user.id,
    validCreateInput(account.id, {
      categoryId: category.id,
      payeeId: payee.id,
      tagIds: [tag.id],
    }),
  );

  expect(result.id).toBeDefined();
  expect(result.accountId).toBe(account.id);
  expect(result.categoryId).toBe(category.id);
  expect(result.payeeId).toBe(payee.id);
  expect(result.amountCents).toBe(5000);
  expect(result.direction).toBe('debit');

  // Verify tag junction
  const tagRows = await serviceDb
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, result.id));
  expect(tagRows).toHaveLength(1);
  expect(tagRows[0].tagId).toBe(tag.id);
});

test('create — creates new payee by name', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  const result = await createTransactionService(
    asDb(serviceDb),
    user.id,
    validCreateInput(account.id, { newPayeeName: 'Brand New Payee' }),
  );

  expect(result.payeeId).toBeDefined();
});

test('create — rejects cross-user accountId', async ({ serviceDb }) => {
  const { account } = await insertAccountWithUser(serviceDb);
  const otherUser = await insertUser(serviceDb);

  await expect(
    createTransactionService(
      asDb(serviceDb),
      otherUser.id,
      validCreateInput(account.id),
    ),
  ).rejects.toMatchObject({ status: 404 });
});

test('create — rejects cross-user categoryId', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const otherUser = await insertUser(serviceDb);
  const otherCategory = await insertCategory(serviceDb, {
    userId: otherUser.id,
  });

  await expect(
    createTransactionService(
      asDb(serviceDb),
      user.id,
      validCreateInput(account.id, { categoryId: otherCategory.id }),
    ),
  ).rejects.toMatchObject({ status: 404 });
});

test('create — writes audit log entry', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  const result = await createTransactionService(
    asDb(serviceDb),
    user.id,
    validCreateInput(account.id),
  );

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, result.id),
        eq(auditLogs.tableName, 'transactions'),
        eq(auditLogs.action, 'create'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].actorId).toBe(user.id);
});
