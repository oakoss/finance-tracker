import { eq } from 'drizzle-orm';
import { expect } from 'vitest';

import {
  transferDismissals,
  transferDismissalsIndexNames,
  transfers,
  transfersCheckNames,
  transfersIndexNames,
} from '@/db/schema';
import { expectPgError } from '~test/assertions';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { insertTransfer } from '~test/factories/transfer.factory';
import { test } from '~test/integration-setup';

async function insertPair(db: Parameters<typeof insertTransaction>[0]) {
  const { account: fromAccount, user } = await insertAccountWithUser(db);
  const toAccount = await insertLedgerAccount(db, { userId: user.id });
  const fromTxn = await insertTransaction(db, { accountId: fromAccount.id });
  const toTxn = await insertTransaction(db, { accountId: toAccount.id });
  return { fromTxn, toTxn, user };
}

test('transfers — rejects pair where fromTransactionId equals toTransactionId', async ({
  db,
}) => {
  const { fromTxn, user } = await insertPair(db);

  await expectPgError(
    () =>
      db
        .insert(transfers)
        .values({
          confidence: 'manual',
          fromTransactionId: fromTxn.id,
          toTransactionId: fromTxn.id,
          userId: user.id,
        }),
    { code: '23514', constraint: transfersCheckNames.pairDistinct },
  );
});

test('transfers — same transaction cannot appear as the "from" leg of two active transfers', async ({
  db,
}) => {
  const { account: fromAccount, user } = await insertAccountWithUser(db);
  const toA = await insertLedgerAccount(db, { userId: user.id });
  const toB = await insertLedgerAccount(db, { userId: user.id });
  const fromTxn = await insertTransaction(db, { accountId: fromAccount.id });
  const toTxnA = await insertTransaction(db, { accountId: toA.id });
  const toTxnB = await insertTransaction(db, { accountId: toB.id });

  await insertTransfer(db, {
    fromTransactionId: fromTxn.id,
    toTransactionId: toTxnA.id,
    userId: user.id,
  });

  await expectPgError(
    () =>
      db
        .insert(transfers)
        .values({
          confidence: 'manual',
          fromTransactionId: fromTxn.id,
          toTransactionId: toTxnB.id,
          userId: user.id,
        }),
    { code: '23505', constraint: transfersIndexNames.fromTransactionIdx },
  );
});

test('transfers — same transaction cannot appear as the "to" leg of two active transfers', async ({
  db,
}) => {
  const { account: fromA, user } = await insertAccountWithUser(db);
  const fromB = await insertLedgerAccount(db, { userId: user.id });
  const toAccount = await insertLedgerAccount(db, { userId: user.id });
  const fromTxnA = await insertTransaction(db, { accountId: fromA.id });
  const fromTxnB = await insertTransaction(db, { accountId: fromB.id });
  const toTxn = await insertTransaction(db, { accountId: toAccount.id });

  await insertTransfer(db, {
    fromTransactionId: fromTxnA.id,
    toTransactionId: toTxn.id,
    userId: user.id,
  });

  await expectPgError(
    () =>
      db
        .insert(transfers)
        .values({
          confidence: 'manual',
          fromTransactionId: fromTxnB.id,
          toTransactionId: toTxn.id,
          userId: user.id,
        }),
    { code: '23505', constraint: transfersIndexNames.toTransactionIdx },
  );
});

test('transfers — cross-column duplicate is not DB-enforced (documented gap)', async ({
  db,
}) => {
  // Separate single-column partial unique indexes can't catch a
  // transaction that appears as `from` on one row and `to` on another.
  // The manual-pair / auto-detect write paths reject this case at the
  // app layer. Flip this test to expect a violation if we add an
  // EXCLUDE constraint or trigger later.
  const { account: aAcc, user } = await insertAccountWithUser(db);
  const bAcc = await insertLedgerAccount(db, { userId: user.id });
  const cAcc = await insertLedgerAccount(db, { userId: user.id });
  const aTxn = await insertTransaction(db, { accountId: aAcc.id });
  const bTxn = await insertTransaction(db, { accountId: bAcc.id });
  const cTxn = await insertTransaction(db, { accountId: cAcc.id });

  await insertTransfer(db, {
    fromTransactionId: aTxn.id,
    toTransactionId: bTxn.id,
    userId: user.id,
  });

  // C → A succeeds even though A already participates as the `from` leg
  // of (A, B). This is the documented gap.
  const fresh = await insertTransfer(db, {
    fromTransactionId: cTxn.id,
    toTransactionId: aTxn.id,
    userId: user.id,
  });
  expect(fresh.id).toBeDefined();
});

test('transfers — pair unique index treats (A,B) and (B,A) as the same pair', async ({
  db,
}) => {
  const { fromTxn, toTxn, user } = await insertPair(db);

  await insertTransfer(db, {
    fromTransactionId: fromTxn.id,
    toTransactionId: toTxn.id,
    userId: user.id,
  });

  await expectPgError(
    () =>
      db
        .insert(transfers)
        .values({
          confidence: 'manual',
          fromTransactionId: toTxn.id,
          toTransactionId: fromTxn.id,
          userId: user.id,
        }),
    { code: '23505', constraint: transfersIndexNames.pairUniqueIdx },
  );
});

test('transfers — soft-deleted pair does not block re-pairing the same transactions', async ({
  db,
}) => {
  const { fromTxn, toTxn, user } = await insertPair(db);

  const original = await insertTransfer(db, {
    fromTransactionId: fromTxn.id,
    toTransactionId: toTxn.id,
    userId: user.id,
  });
  await db
    .update(transfers)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(eq(transfers.id, original.id));

  const [fresh] = await db
    .insert(transfers)
    .values({
      confidence: 'manual',
      fromTransactionId: fromTxn.id,
      toTransactionId: toTxn.id,
      userId: user.id,
    })
    .returning();
  expect(fresh.deletedAt).toBeNull();
  expect(fresh.id).not.toBe(original.id);
});

test('transfer_dismissals — rejects pair where txnAId equals txnBId', async ({
  db,
}) => {
  const { fromTxn, user } = await insertPair(db);

  await expectPgError(
    () =>
      db
        .insert(transferDismissals)
        .values({ txnAId: fromTxn.id, txnBId: fromTxn.id, userId: user.id }),
    { code: '23514', constraint: transfersCheckNames.dismissalsOrderedPair },
  );
});

test('transfer_dismissals — rejects pair where txnAId is greater than txnBId', async ({
  db,
}) => {
  const { fromTxn, toTxn, user } = await insertPair(db);
  // Sort explicitly — UUIDv7 ordering within a millisecond depends on
  // generator behavior, so don't lean on insert-order monotonicity.
  const [smaller, larger] = [fromTxn.id, toTxn.id].toSorted();

  await expectPgError(
    () =>
      db
        .insert(transferDismissals)
        .values({ txnAId: larger, txnBId: smaller, userId: user.id }),
    { code: '23514', constraint: transfersCheckNames.dismissalsOrderedPair },
  );
});

test('transfer_dismissals — accepts ordered pair and rejects exact duplicate', async ({
  db,
}) => {
  const { fromTxn, toTxn, user } = await insertPair(db);
  const [smaller, larger] =
    fromTxn.id < toTxn.id ? [fromTxn.id, toTxn.id] : [toTxn.id, fromTxn.id];

  await db
    .insert(transferDismissals)
    .values({ txnAId: smaller, txnBId: larger, userId: user.id });

  await expectPgError(
    () =>
      db
        .insert(transferDismissals)
        .values({ txnAId: smaller, txnBId: larger, userId: user.id }),
    { code: '23505', constraint: transferDismissalsIndexNames.uniquePairIdx },
  );
});

test('transfer_dismissals — soft-deleted dismissal does not block re-dismissing the same pair', async ({
  db,
}) => {
  const { fromTxn, toTxn, user } = await insertPair(db);
  const [smaller, larger] =
    fromTxn.id < toTxn.id ? [fromTxn.id, toTxn.id] : [toTxn.id, fromTxn.id];

  const [original] = await db
    .insert(transferDismissals)
    .values({ txnAId: smaller, txnBId: larger, userId: user.id })
    .returning();
  await db
    .update(transferDismissals)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(eq(transferDismissals.id, original.id));

  const [fresh] = await db
    .insert(transferDismissals)
    .values({ txnAId: smaller, txnBId: larger, userId: user.id })
    .returning();
  expect(fresh.id).not.toBe(original.id);
  expect(fresh.deletedAt).toBeNull();
});
