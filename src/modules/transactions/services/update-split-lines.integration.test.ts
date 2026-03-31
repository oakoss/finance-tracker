import { eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { splitLines } from '@/modules/transactions/db/schema';
import { splitTransactionService } from '@/modules/transactions/services/split-transaction';
import { updateSplitLinesService } from '@/modules/transactions/services/update-split-lines';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import type { Db as TestDb } from '~test/factories/base';
import { insertCategory } from '~test/factories/category.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('update-split-lines — replaces all lines', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const cat1 = await insertCategory(serviceDb, { userId: user.id });
  const cat2 = await insertCategory(serviceDb, { userId: user.id });
  const txn = await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 10_000,
    createdById: user.id,
  });

  await splitTransactionService(asDb(serviceDb), user.id, {
    id: txn.id,
    lines: [{ amountCents: 6000 }, { amountCents: 4000 }],
  });

  await updateSplitLinesService(asDb(serviceDb), user.id, {
    id: txn.id,
    lines: [
      { amountCents: 3000, categoryId: cat1.id },
      { amountCents: 5000, categoryId: cat2.id },
      { amountCents: 2000 },
    ],
  });

  const lines = await serviceDb
    .select()
    .from(splitLines)
    .where(eq(splitLines.transactionId, txn.id));
  expect(lines).toHaveLength(3);
  expect(lines.map((l) => l.amountCents).toSorted((a, b) => a - b)).toEqual([
    2000, 3000, 5000,
  ]);
});

test('update-split-lines — rejects if not split', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const txn = await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 10_000,
    createdById: user.id,
  });

  await expect(
    updateSplitLinesService(asDb(serviceDb), user.id, {
      id: txn.id,
      lines: [{ amountCents: 5000 }, { amountCents: 5000 }],
    }),
  ).rejects.toMatchObject({ status: 409 });
});

test('update-split-lines — rejects mismatched sum', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const txn = await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 10_000,
    createdById: user.id,
  });

  await splitTransactionService(asDb(serviceDb), user.id, {
    id: txn.id,
    lines: [{ amountCents: 6000 }, { amountCents: 4000 }],
  });

  await expect(
    updateSplitLinesService(asDb(serviceDb), user.id, {
      id: txn.id,
      lines: [{ amountCents: 3000 }, { amountCents: 3000 }],
    }),
  ).rejects.toMatchObject({ status: 422 });
});
