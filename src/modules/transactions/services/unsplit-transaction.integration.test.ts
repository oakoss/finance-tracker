import { eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { splitLines, transactions } from '@/modules/transactions/db/schema';
import { splitTransactionService } from '@/modules/transactions/services/split-transaction';
import { unsplitTransactionService } from '@/modules/transactions/services/unsplit-transaction';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import type { Db as TestDb } from '~test/factories/base';
import { insertCategory } from '~test/factories/category.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('unsplit — deletes lines and restores parent', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const cat = await insertCategory(serviceDb, { userId: user.id });
  const txn = await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 10_000,
    categoryId: cat.id,
    createdById: user.id,
  });

  await splitTransactionService(asDb(serviceDb), user.id, {
    id: txn.id,
    lines: [{ amountCents: 6000, categoryId: cat.id }, { amountCents: 4000 }],
  });

  await unsplitTransactionService(asDb(serviceDb), user.id, { id: txn.id });

  const [parent] = await serviceDb
    .select()
    .from(transactions)
    .where(eq(transactions.id, txn.id));
  expect(parent.isSplit).toBe(false);
  // categoryId is NOT restored — user must re-assign
  expect(parent.categoryId).toBeNull();

  const lines = await serviceDb
    .select()
    .from(splitLines)
    .where(eq(splitLines.transactionId, txn.id));
  expect(lines).toHaveLength(0);
});

test('unsplit — rejects if not split', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const txn = await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 10_000,
    createdById: user.id,
  });

  await expect(
    unsplitTransactionService(asDb(serviceDb), user.id, { id: txn.id }),
  ).rejects.toMatchObject({ status: 409 });
});

test('unsplit — rejects cross-user transaction', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const otherUser = await insertUser(serviceDb);
  const txn = await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 10_000,
    createdById: user.id,
    isSplit: true,
  });

  await expect(
    unsplitTransactionService(asDb(serviceDb), otherUser.id, { id: txn.id }),
  ).rejects.toMatchObject({ status: 404 });
});
