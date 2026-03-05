import { eq } from 'drizzle-orm';
import { expect } from 'vitest';

import { payees, transactions, transactionTags } from '@/db/schema';
import { expectPgError } from '~test/assertions';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import { insertCategory } from '~test/factories/category.factory';
import { insertPayee } from '~test/factories/payee.factory';
import { insertTag } from '~test/factories/tag.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { test } from '~test/integration-setup';

// ---------------------------------------------------------------------------
// DB constraint tests — verify raw schema behavior the service layer can't test
// ---------------------------------------------------------------------------

test('create — transactionTags rejects duplicate (transactionId, tagId)', async ({
  db,
}) => {
  const { account, user } = await insertAccountWithUser(db);
  const tag = await insertTag(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });

  await db.insert(transactionTags).values({
    tagId: tag.id,
    transactionId: txn.id,
  });

  await expectPgError(
    () =>
      db.insert(transactionTags).values({
        tagId: tag.id,
        transactionId: txn.id,
      }),
    { code: '23505', constraint: 'transaction_tags_unique_idx' },
  );
});

test('create — inline payee: re-creates after soft-delete (partial index)', async ({
  db,
}) => {
  const { user } = await insertAccountWithUser(db);

  await insertPayee(db, {
    deletedAt: new Date(),
    name: 'Gone Corp',
    normalizedName: 'gone corp',
    userId: user.id,
  });

  const fresh = await insertPayee(db, {
    name: 'Gone Corp',
    normalizedName: 'gone corp',
    userId: user.id,
  });

  expect(fresh.name).toBe('Gone Corp');
  expect(fresh.deletedAt).toBeNull();

  const all = await db
    .select()
    .from(payees)
    .where(eq(payees.normalizedName, 'gone corp'));
  expect(all).toHaveLength(2);
});

test('delete — transaction tags remain in DB after soft-delete', async ({
  db,
}) => {
  const { account, user } = await insertAccountWithUser(db);
  const txn = await insertTransaction(db, { accountId: account.id });
  const tag = await insertTag(db, { userId: user.id });

  await db
    .insert(transactionTags)
    .values({ tagId: tag.id, transactionId: txn.id });

  await db
    .update(transactions)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(eq(transactions.id, txn.id));

  const tagRows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  expect(tagRows).toHaveLength(1);
  expect(tagRows[0].tagId).toBe(tag.id);
});

// ---------------------------------------------------------------------------
// Cross-user resource linking (DB level)
// DB FKs don't enforce ownership — service layer does (TREK-173).
// These tests confirm the DB constraint gap still exists at the raw SQL level,
// while resolvePayeeId/resolveTagIds/create+update services now reject it.
// ---------------------------------------------------------------------------

test('create — cross-user categoryId accepted by DB (no ownership FK)', async ({
  db,
}) => {
  const { account: accountA, user: userA } = await insertAccountWithUser(db);
  const { user: userB } = await insertAccountWithUser(db);
  const categoryB = await insertCategory(db, {
    type: 'expense',
    userId: userB.id,
  });

  const [txn] = await db
    .insert(transactions)
    .values({
      accountId: accountA.id,
      amountCents: 1000,
      categoryId: categoryB.id,
      createdById: userA.id,
      description: 'cross-user category',
      direction: 'debit',
      postedAt: new Date(),
      transactionAt: new Date(),
    })
    .returning();

  expect(txn.categoryId).toBe(categoryB.id);

  const owned = await db.query.categories.findFirst({
    where: (t, { and: a, eq: e }) =>
      a(e(t.id, categoryB.id), e(t.userId, userA.id)),
  });
  expect(owned).toBeUndefined();
});

test('create — cross-user payeeId accepted by DB (no ownership FK)', async ({
  db,
}) => {
  const { account: accountA, user: userA } = await insertAccountWithUser(db);
  const { user: userB } = await insertAccountWithUser(db);
  const payeeB = await insertPayee(db, { userId: userB.id });

  const [txn] = await db
    .insert(transactions)
    .values({
      accountId: accountA.id,
      amountCents: 1000,
      createdById: userA.id,
      description: 'cross-user payee',
      direction: 'debit',
      payeeId: payeeB.id,
      postedAt: new Date(),
      transactionAt: new Date(),
    })
    .returning();

  expect(txn.payeeId).toBe(payeeB.id);

  const owned = await db.query.payees.findFirst({
    where: (t, { and: a, eq: e }) =>
      a(e(t.id, payeeB.id), e(t.userId, userA.id)),
  });
  expect(owned).toBeUndefined();
});

test('create — cross-user tagId accepted by DB (no ownership FK)', async ({
  db,
}) => {
  const { account: accountA, user: userA } = await insertAccountWithUser(db);
  const { user: userB } = await insertAccountWithUser(db);
  const tagB = await insertTag(db, { userId: userB.id });
  const txn = await insertTransaction(db, { accountId: accountA.id });

  await db
    .insert(transactionTags)
    .values({ tagId: tagB.id, transactionId: txn.id });

  const rows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  expect(rows).toHaveLength(1);
  expect(rows[0].tagId).toBe(tagB.id);

  const owned = await db.query.tags.findFirst({
    where: (t, { and: a, eq: e }) => a(e(t.id, tagB.id), e(t.userId, userA.id)),
  });
  expect(owned).toBeUndefined();
});
