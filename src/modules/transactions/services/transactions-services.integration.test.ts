import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { notDeleted } from '@/lib/audit/soft-delete';
import {
  payees,
  transactions,
  transactionTags,
} from '@/modules/transactions/db/schema';
import { createTransactionService } from '@/modules/transactions/services/create-transaction';
import { deleteTransactionService } from '@/modules/transactions/services/delete-transaction';
import { listTransactionsService } from '@/modules/transactions/services/list-transactions';
import { updateTransactionService } from '@/modules/transactions/services/update-transaction';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertCategory } from '~test/factories/category.factory';
import { insertPayee } from '~test/factories/payee.factory';
import { insertTag } from '~test/factories/tag.factory';
import { insertTransactionWithRelations } from '~test/factories/transaction-with-relations.factory';
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

// ---------------------------------------------------------------------------
// updateTransactionService
// ---------------------------------------------------------------------------

test('update — updates transaction fields', async ({ serviceDb }) => {
  const ctx = await insertTransactionWithRelations(serviceDb, {
    withCategory: true,
    withPayee: true,
  });

  const updated = await updateTransactionService(asDb(serviceDb), ctx.user.id, {
    amountCents: 9999,
    description: 'Updated description',
    id: ctx.transaction.id,
  });

  expect(updated.amountCents).toBe(9999);
  expect(updated.description).toBe('Updated description');
});

test('update — rejects cross-user categoryId', async ({ serviceDb }) => {
  const ctx = await insertTransactionWithRelations(serviceDb);
  const otherUser = await insertUser(serviceDb);
  const otherCategory = await insertCategory(serviceDb, {
    userId: otherUser.id,
  });

  await expect(
    updateTransactionService(asDb(serviceDb), ctx.user.id, {
      categoryId: otherCategory.id,
      id: ctx.transaction.id,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — syncs tags (replaces old with new)', async ({ serviceDb }) => {
  const ctx = await insertTransactionWithRelations(serviceDb);
  const tagA = await insertTag(serviceDb, { userId: ctx.user.id });
  const tagB = await insertTag(serviceDb, { userId: ctx.user.id });

  // Set initial tags
  await updateTransactionService(asDb(serviceDb), ctx.user.id, {
    id: ctx.transaction.id,
    tagIds: [tagA.id],
  });

  // Replace with different tag
  await updateTransactionService(asDb(serviceDb), ctx.user.id, {
    id: ctx.transaction.id,
    tagIds: [tagB.id],
  });

  const tagRows = await serviceDb
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, ctx.transaction.id));

  expect(tagRows).toHaveLength(1);
  expect(tagRows[0].tagId).toBe(tagB.id);
});

test('update — rejects nonexistent transaction', async ({ serviceDb }) => {
  const { user } = await insertAccountWithUser(serviceDb);

  await expect(
    updateTransactionService(asDb(serviceDb), user.id, {
      description: 'nope',
      id: fakeId(),
    }),
  ).rejects.toMatchObject({ status: 404 });
});

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

// ---------------------------------------------------------------------------
// listTransactionsService
// ---------------------------------------------------------------------------

test('list — returns user transactions with relations', async ({ db }) => {
  const ctx = await insertTransactionWithRelations(db, {
    withCategory: true,
    withPayee: true,
  });

  const rows = await listTransactionsService(asDb(db), ctx.user.id);

  expect(rows).toHaveLength(1);
  expect(rows[0].id).toBe(ctx.transaction.id);
  expect(rows[0].categoryName).toBe(ctx.category!.name);
  expect(rows[0].payeeName).toBe(ctx.payee!.name);
});

test('list — excludes other user transactions', async ({ db }) => {
  await insertTransactionWithRelations(db);
  const otherUser = await insertUser(db);

  const rows = await listTransactionsService(asDb(db), otherUser.id);

  expect(rows).toHaveLength(0);
});

test('list — excludes soft-deleted transactions', async ({ db }) => {
  const ctx = await insertTransactionWithRelations(db);

  await db
    .update(transactions)
    .set({ deletedAt: new Date(), deletedById: ctx.user.id })
    .where(eq(transactions.id, ctx.transaction.id));

  const rows = await listTransactionsService(asDb(db), ctx.user.id);

  expect(rows).toHaveLength(0);
});

test('list — suppresses deleted payee names', async ({ db }) => {
  const ctx = await insertTransactionWithRelations(db, { withPayee: true });

  await db
    .update(payees)
    .set({ deletedAt: new Date() })
    .where(eq(payees.id, ctx.payee!.id));

  const rows = await listTransactionsService(asDb(db), ctx.user.id);

  expect(rows).toHaveLength(1);
  expect(rows[0].payeeName).toBeNull();
});
