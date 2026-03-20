import { eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { transactionTags } from '@/modules/transactions/db/schema';
import { updateTransactionService } from '@/modules/transactions/services/update-transaction';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertCategory } from '~test/factories/category.factory';
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
