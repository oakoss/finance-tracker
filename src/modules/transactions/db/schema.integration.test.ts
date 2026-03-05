import { eq } from 'drizzle-orm';
import { expect } from 'vitest';

import { payees, transactions, transactionTags } from '@/db/schema';
import { expectPgError } from '~test/assertions';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import { insertCategory } from '~test/factories/category.factory';
import { insertPayee } from '~test/factories/payee.factory';
import { insertTag } from '~test/factories/tag.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

// ---------------------------------------------------------------------------
// DB constraint tests — payees
// ---------------------------------------------------------------------------

test('payees — rejects duplicate (userId, name)', async ({ db }) => {
  const user = await insertUser(db);
  await insertPayee(db, { name: 'Unique Payee', userId: user.id });

  await expectPgError(
    () => insertPayee(db, { name: 'Unique Payee', userId: user.id }),
    { code: '23505', constraint: 'payees_user_name_idx' },
  );
});

test('payees — re-creates after soft-delete (partial index)', async ({
  db,
}) => {
  const user = await insertUser(db);
  await insertPayee(db, {
    deletedAt: new Date(),
    name: 'Gone Payee',
    normalizedName: 'gone payee',
    userId: user.id,
  });

  const fresh = await insertPayee(db, {
    name: 'Gone Payee',
    normalizedName: 'gone payee',
    userId: user.id,
  });

  expect(fresh.name).toBe('Gone Payee');
  expect(fresh.deletedAt).toBeNull();
});

// ---------------------------------------------------------------------------
// DB constraint tests — tags
// ---------------------------------------------------------------------------

test('tags — rejects duplicate (userId, name)', async ({ db }) => {
  const user = await insertUser(db);
  await insertTag(db, { name: 'unique-tag', userId: user.id });

  await expectPgError(
    () => insertTag(db, { name: 'unique-tag', userId: user.id }),
    { code: '23505', constraint: 'tags_user_name_idx' },
  );
});

test('tags — re-creates after soft-delete (partial index)', async ({ db }) => {
  const user = await insertUser(db);
  await insertTag(db, {
    deletedAt: new Date(),
    name: 'gone-tag',
    userId: user.id,
  });

  const fresh = await insertTag(db, { name: 'gone-tag', userId: user.id });

  expect(fresh.name).toBe('gone-tag');
  expect(fresh.deletedAt).toBeNull();
});

// ---------------------------------------------------------------------------
// DB constraint tests — transactions
// ---------------------------------------------------------------------------

test('transactionTags — rejects duplicate (transactionId, tagId)', async ({
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

test('payees — partial index allows re-insert after soft-delete in transaction context', async ({
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

test('transactionTags — tags remain in DB after transaction soft-delete', async ({
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
// DB FKs don't enforce ownership — service layer does.
// These tests confirm the DB constraint gap still exists at the raw SQL level.
// ---------------------------------------------------------------------------

test('transactions — cross-user categoryId accepted by DB (no ownership FK)', async ({
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

test('transactions — cross-user payeeId accepted by DB (no ownership FK)', async ({
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

test('transactions — cross-user tagId accepted by DB (no ownership FK)', async ({
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
