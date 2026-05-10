import { eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { payees } from '@/modules/payees/db/schema';
import { transactions } from '@/modules/transactions/db/schema';
import { createTransactionService } from '@/modules/transactions/services/create-transaction';
import { listTransactionsService } from '@/modules/transactions/services/list-transactions';
import { transfers } from '@/modules/transfers/db/schema';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import type { Db as TestDb } from '~test/factories/base';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertTag } from '~test/factories/tag.factory';
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

test('list — ordered by transactionAt DESC', async ({ db }) => {
  const { account, user } = await insertAccountWithUser(db);

  await createTransactionService(
    asDb(db),
    user.id,
    validCreateInput(account.id, {
      description: 'Older',
      transactionAt: '2024-01-01',
    }),
  );
  await createTransactionService(
    asDb(db),
    user.id,
    validCreateInput(account.id, {
      description: 'Newer',
      transactionAt: '2024-06-15',
    }),
  );

  const rows = await listTransactionsService(asDb(db), user.id);

  expect(rows).toHaveLength(2);
  expect(rows[0].description).toBe('Newer');
  expect(rows[1].description).toBe('Older');
});

test('list — includes tags via junction table', async ({ db }) => {
  const { account, user } = await insertAccountWithUser(db);
  const tag = await insertTag(db, { name: 'groceries', userId: user.id });

  await createTransactionService(
    asDb(db),
    user.id,
    validCreateInput(account.id, { tagIds: [tag.id] }),
  );

  const rows = await listTransactionsService(asDb(db), user.id);

  expect(rows).toHaveLength(1);
  expect(rows[0].tags).toHaveLength(1);
  expect(rows[0].tags[0].name).toBe('groceries');
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

test('list — derives isTransfer for both legs of a transfer pair', async ({
  db,
}) => {
  const { account: fromAccount, user } = await insertAccountWithUser(db);
  const toAccount = await insertLedgerAccount(db, { userId: user.id });
  const fromTxn = await insertTransaction(db, { accountId: fromAccount.id });
  const toTxn = await insertTransaction(db, { accountId: toAccount.id });
  const unrelated = await insertTransaction(db, { accountId: fromAccount.id });

  await insertTransfer(db, {
    fromTransactionId: fromTxn.id,
    toTransactionId: toTxn.id,
    userId: user.id,
  });

  const rows = await listTransactionsService(asDb(db), user.id);
  const byId = new Map(rows.map((r) => [r.id, r]));

  expect(byId.get(fromTxn.id)?.isTransfer).toBe(true);
  expect(byId.get(toTxn.id)?.isTransfer).toBe(true);
  expect(byId.get(unrelated.id)?.isTransfer).toBe(false);
});

test('list — isTransfer is false when the transfer is soft-deleted', async ({
  db,
}) => {
  const { account: fromAccount, user } = await insertAccountWithUser(db);
  const toAccount = await insertLedgerAccount(db, { userId: user.id });
  const fromTxn = await insertTransaction(db, { accountId: fromAccount.id });
  const toTxn = await insertTransaction(db, { accountId: toAccount.id });
  const transfer = await insertTransfer(db, {
    fromTransactionId: fromTxn.id,
    toTransactionId: toTxn.id,
    userId: user.id,
  });

  await db
    .update(transfers)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(eq(transfers.id, transfer.id));

  const rows = await listTransactionsService(asDb(db), user.id);

  expect(rows.find((r) => r.id === fromTxn.id)?.isTransfer).toBe(false);
  expect(rows.find((r) => r.id === toTxn.id)?.isTransfer).toBe(false);
});

test('list — isTransfer scoped to caller (not leaked from other user)', async ({
  db,
}) => {
  const { account: fromAccount, user } = await insertAccountWithUser(db);
  const toAccount = await insertLedgerAccount(db, { userId: user.id });
  const fromTxn = await insertTransaction(db, { accountId: fromAccount.id });
  const toTxn = await insertTransaction(db, { accountId: toAccount.id });
  await insertTransfer(db, {
    fromTransactionId: fromTxn.id,
    toTransactionId: toTxn.id,
    userId: user.id,
  });

  // Other user can see neither the transactions (different accounts) nor
  // the transfer scan (different userId scope). Their list is empty.
  const otherUser = await insertUser(db);
  const otherRows = await listTransactionsService(asDb(db), otherUser.id);
  expect(otherRows).toHaveLength(0);
});
