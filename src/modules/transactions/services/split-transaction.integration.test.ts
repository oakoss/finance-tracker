import { eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { splitLines, transactions } from '@/modules/transactions/db/schema';
import { splitTransactionService } from '@/modules/transactions/services/split-transaction';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import type { Db as TestDb } from '~test/factories/base';
import { insertCategory } from '~test/factories/category.factory';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { insertTransfer } from '~test/factories/transfer.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('split — creates split lines and updates parent', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const cat1 = await insertCategory(serviceDb, { userId: user.id });
  const cat2 = await insertCategory(serviceDb, { userId: user.id });
  const txn = await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 10_000,
    categoryId: cat1.id,
    createdById: user.id,
    direction: 'debit',
  });

  await splitTransactionService(asDb(serviceDb), user.id, {
    id: txn.id,
    lines: [
      { amountCents: 7000, categoryId: cat1.id },
      { amountCents: 3000, categoryId: cat2.id },
    ],
  });

  // Parent should have isSplit=true, categoryId=null
  const [parent] = await serviceDb
    .select()
    .from(transactions)
    .where(eq(transactions.id, txn.id));
  expect(parent.isSplit).toBe(true);
  expect(parent.categoryId).toBeNull();

  // Split lines created
  const lines = await serviceDb
    .select()
    .from(splitLines)
    .where(eq(splitLines.transactionId, txn.id));
  expect(lines).toHaveLength(2);
  expect(lines.map((l) => l.amountCents).toSorted((a, b) => a - b)).toEqual([
    3000, 7000,
  ]);
});

test('split — rejects if sum does not match parent amount', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const txn = await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 10_000,
    createdById: user.id,
  });

  await expect(
    splitTransactionService(asDb(serviceDb), user.id, {
      id: txn.id,
      lines: [{ amountCents: 5000 }, { amountCents: 3000 }],
    }),
  ).rejects.toMatchObject({ status: 422 });
});

test('split — rejects fewer than 2 lines', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const txn = await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 10_000,
    createdById: user.id,
  });

  await expect(
    splitTransactionService(asDb(serviceDb), user.id, {
      id: txn.id,
      lines: [{ amountCents: 10_000 }],
    }),
  ).rejects.toMatchObject({ status: 422 });
});

test('split — rejects if already split', async ({ serviceDb }) => {
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
    splitTransactionService(asDb(serviceDb), user.id, {
      id: txn.id,
      lines: [{ amountCents: 5000 }, { amountCents: 5000 }],
    }),
  ).rejects.toMatchObject({ status: 409 });
});

test('split — rejects cross-user transaction', async ({ serviceDb }) => {
  const { account } = await insertAccountWithUser(serviceDb);
  const otherUser = await insertUser(serviceDb);
  const txn = await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 10_000,
    createdById: otherUser.id,
  });

  await expect(
    splitTransactionService(asDb(serviceDb), otherUser.id, {
      id: txn.id,
      lines: [{ amountCents: 5000 }, { amountCents: 5000 }],
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('split — rejects transfer transactions', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const account2 = await insertLedgerAccount(serviceDb, { userId: user.id });
  const transfer = await insertTransfer(serviceDb, {
    fromAccountId: account.id,
    toAccountId: account2.id,
    userId: user.id,
  });
  const txn = await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 10_000,
    createdById: user.id,
    transferId: transfer.id,
  });

  await expect(
    splitTransactionService(asDb(serviceDb), user.id, {
      id: txn.id,
      lines: [{ amountCents: 5000 }, { amountCents: 5000 }],
    }),
  ).rejects.toMatchObject({ status: 422 });
});

test('split — assigns sort order to lines', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const txn = await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 10_000,
    createdById: user.id,
  });

  await splitTransactionService(asDb(serviceDb), user.id, {
    id: txn.id,
    lines: [
      { amountCents: 3000, memo: 'first' },
      { amountCents: 4000, memo: 'second' },
      { amountCents: 3000, memo: 'third' },
    ],
  });

  const lines = await serviceDb
    .select()
    .from(splitLines)
    .where(eq(splitLines.transactionId, txn.id));
  const sorted = lines.toSorted((a, b) => a.sortOrder - b.sortOrder);
  expect(sorted.map((l) => l.memo)).toEqual(['first', 'second', 'third']);
});

test('split — writes audit log', async ({ serviceDb }) => {
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

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.recordId, txn.id));
  expect(logs.length).toBeGreaterThanOrEqual(1);
});
