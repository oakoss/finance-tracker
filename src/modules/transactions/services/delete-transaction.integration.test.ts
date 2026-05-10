import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { notDeleted } from '@/lib/audit/soft-delete';
import { transactions } from '@/modules/transactions/db/schema';
import { deleteTransactionService } from '@/modules/transactions/services/delete-transaction';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import type { Db as TestDb } from '~test/factories/base';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertTransactionWithRelations } from '~test/factories/transaction-with-relations.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { insertTransfer } from '~test/factories/transfer.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

/**
 * Cast test Db to app Db. Safe because PgTransaction extends PgDatabase
 * at runtime — all query/mutation methods are available.
 */
const asDb = (db: TestDb) => db as unknown as Db;

// ---------------------------------------------------------------------------
// deleteTransactionService
// ---------------------------------------------------------------------------

test('delete — soft-deletes transaction', async ({ serviceDb }) => {
  const ctx = await insertTransactionWithRelations(serviceDb);

  await deleteTransactionService(asDb(serviceDb), ctx.user.id, {
    id: ctx.transaction.id,
  });

  const rows = await serviceDb
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, ctx.transaction.id),
        notDeleted(transactions.deletedAt),
      ),
    );

  expect(rows).toHaveLength(0);
});

test('delete — rejects cross-user transaction', async ({ serviceDb }) => {
  const ctx = await insertTransactionWithRelations(serviceDb);
  const otherUser = await insertUser(serviceDb);

  await expect(
    deleteTransactionService(asDb(serviceDb), otherUser.id, {
      id: ctx.transaction.id,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('delete — rejects paired transfer transactions on either leg', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const account2 = await insertLedgerAccount(serviceDb, { userId: user.id });
  const fromTxn = await insertTransaction(serviceDb, {
    accountId: account.id,
    createdById: user.id,
  });
  const toTxn = await insertTransaction(serviceDb, {
    accountId: account2.id,
    createdById: user.id,
  });
  await insertTransfer(serviceDb, {
    fromTransactionId: fromTxn.id,
    toTransactionId: toTxn.id,
    userId: user.id,
  });

  await expect(
    deleteTransactionService(asDb(serviceDb), user.id, { id: fromTxn.id }),
  ).rejects.toMatchObject({ status: 422 });

  await expect(
    deleteTransactionService(asDb(serviceDb), user.id, { id: toTxn.id }),
  ).rejects.toMatchObject({ status: 422 });
});

test('delete — writes audit log entry', async ({ serviceDb }) => {
  const ctx = await insertTransactionWithRelations(serviceDb);

  await deleteTransactionService(asDb(serviceDb), ctx.user.id, {
    id: ctx.transaction.id,
  });

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, ctx.transaction.id),
        eq(auditLogs.tableName, 'transactions'),
        eq(auditLogs.action, 'delete'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].actorId).toBe(ctx.user.id);
});
