import type { Db } from '@/db';

import { transferDismissals } from '@/db/schema';
import { gatherUserData } from '@/modules/export/services/gather-user-data';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import type { Db as TestDb } from '~test/factories/base';
import { insertCategory } from '~test/factories/category.factory';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertPayee } from '~test/factories/payee.factory';
import { insertTag } from '~test/factories/tag.factory';
import { insertTransactionTag } from '~test/factories/transaction-tag.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { insertTransfer } from '~test/factories/transfer.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('returns all entity types for user with data', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const payee = await insertPayee(serviceDb, { userId: user.id });
  const tag = await insertTag(serviceDb, { userId: user.id });
  const tx = await insertTransaction(serviceDb, {
    accountId: account.id,
    categoryId: category.id,
    payeeId: payee.id,
  });
  await insertTransactionTag(serviceDb, {
    tagId: tag.id,
    transactionId: tx.id,
  });

  const result = await gatherUserData(asDb(serviceDb), user.id);

  expect(result.accounts).toHaveLength(1);
  expect(result.accounts[0].id).toBe(account.id);
  expect(result.categories).toHaveLength(1);
  expect(result.payees).toHaveLength(1);
  expect(result.tags).toHaveLength(1);
  expect(result.transactions).toHaveLength(1);
  expect(result.transactionTags).toHaveLength(1);
  expect(result.transactionTags[0].tagId).toBe(tag.id);
});

test('returns empty arrays for user with no data', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const result = await gatherUserData(asDb(serviceDb), user.id);

  expect(result.accounts).toHaveLength(0);
  expect(result.categories).toHaveLength(0);
  expect(result.payees).toHaveLength(0);
  expect(result.tags).toHaveLength(0);
  expect(result.transactions).toHaveLength(0);
  expect(result.transactionTags).toHaveLength(0);
  expect(result.budgetPeriods).toHaveLength(0);
  expect(result.preferences).toBeNull();
});

test('excludes soft-deleted records', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  await insertTransaction(serviceDb, {
    accountId: account.id,
    deletedAt: new Date(),
  });
  await insertCategory(serviceDb, { deletedAt: new Date(), userId: user.id });

  const result = await gatherUserData(asDb(serviceDb), user.id);

  expect(result.transactions).toHaveLength(0);
  expect(result.categories).toHaveLength(0);
});

test('does not return other users data', async ({ serviceDb }) => {
  const { account: _a, user: _u } = await insertAccountWithUser(serviceDb);
  const otherUser = await insertUser(serviceDb);

  const result = await gatherUserData(asDb(serviceDb), otherUser.id);

  expect(result.accounts).toHaveLength(0);
  expect(result.transactions).toHaveLength(0);
});

test('returns transfers and dismissals scoped to caller', async ({
  serviceDb,
}) => {
  const { account: fromAccount, user } = await insertAccountWithUser(serviceDb);
  const toAccount = await insertLedgerAccount(serviceDb, { userId: user.id });
  const fromTxn = await insertTransaction(serviceDb, {
    accountId: fromAccount.id,
  });
  const toTxn = await insertTransaction(serviceDb, { accountId: toAccount.id });
  await insertTransfer(serviceDb, {
    fromTransactionId: fromTxn.id,
    toTransactionId: toTxn.id,
    userId: user.id,
  });

  const otherUser = await insertUser(serviceDb);
  const otherFromAccount = await insertLedgerAccount(serviceDb, {
    userId: otherUser.id,
  });
  const otherToAccount = await insertLedgerAccount(serviceDb, {
    userId: otherUser.id,
  });
  const otherFromTxn = await insertTransaction(serviceDb, {
    accountId: otherFromAccount.id,
  });
  const otherToTxn = await insertTransaction(serviceDb, {
    accountId: otherToAccount.id,
  });
  await insertTransfer(serviceDb, {
    fromTransactionId: otherFromTxn.id,
    toTransactionId: otherToTxn.id,
    userId: otherUser.id,
  });

  const [smaller, larger] = [fromTxn.id, toTxn.id].toSorted();
  const [activeDismissal] = await serviceDb
    .insert(transferDismissals)
    .values({ txnAId: smaller, txnBId: larger, userId: user.id })
    .returning();

  // Soft-deleted dismissal must be filtered out.
  const [softTxnA, softTxnB] = await Promise.all([
    insertTransaction(serviceDb, { accountId: fromAccount.id }),
    insertTransaction(serviceDb, { accountId: toAccount.id }),
  ]);
  const [softSmaller, softLarger] = [softTxnA.id, softTxnB.id].toSorted();
  await serviceDb
    .insert(transferDismissals)
    .values({
      deletedAt: new Date(),
      txnAId: softSmaller,
      txnBId: softLarger,
      userId: user.id,
    });

  const result = await gatherUserData(asDb(serviceDb), user.id);

  expect(result.transfers).toHaveLength(1);
  expect(result.transfers[0].userId).toBe(user.id);
  expect(result.transferDismissals).toHaveLength(1);
  expect(result.transferDismissals[0].id).toBe(activeDismissal.id);
});
