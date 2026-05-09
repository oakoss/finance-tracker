import { eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { payees } from '@/modules/payees/db/schema';
import { deletePayeeAliasService } from '@/modules/payees/services/delete-payee-alias';
import { payeeAliases } from '@/modules/rules/db/schema';
import type { Db as TestDb } from '~test/factories/base';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

async function insertPayeeWithAlias(
  db: TestDb,
  userId: string,
  payeeName: string,
  alias: string,
) {
  const [payee] = await db
    .insert(payees)
    .values({
      createdById: userId,
      name: payeeName,
      normalizedName: payeeName.toLowerCase(),
      userId,
    })
    .returning();
  if (!payee) throw new Error('payee insert returned no row');

  const [aliasRow] = await db
    .insert(payeeAliases)
    .values({ alias, createdById: userId, payeeId: payee.id })
    .returning();
  if (!aliasRow) throw new Error('alias insert returned no row');

  return { aliasRow, payee };
}

test('deletePayeeAlias — soft-deletes (sets deletedAt + deletedById)', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const { aliasRow } = await insertPayeeWithAlias(
    serviceDb,
    user.id,
    'Acme',
    'acme',
  );

  await deletePayeeAliasService(asDb(serviceDb), user.id, { id: aliasRow.id });

  const [row] = await serviceDb
    .select()
    .from(payeeAliases)
    .where(eq(payeeAliases.id, aliasRow.id));
  expect(row?.deletedAt).toBeInstanceOf(Date);
  expect(row?.deletedById).toBe(user.id);
});

test('deletePayeeAlias — 404 when alias is already soft-deleted', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const { aliasRow } = await insertPayeeWithAlias(
    serviceDb,
    user.id,
    'Acme',
    'acme',
  );
  await deletePayeeAliasService(asDb(serviceDb), user.id, { id: aliasRow.id });

  await expect(
    deletePayeeAliasService(asDb(serviceDb), user.id, { id: aliasRow.id }),
  ).rejects.toThrow(/alias not found/i);
});

test('deletePayeeAlias — 404 when alias does not exist', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  await expect(
    deletePayeeAliasService(asDb(serviceDb), user.id, {
      id: '00000000-0000-7000-8000-000000000000',
    }),
  ).rejects.toThrow(/alias not found/i);
});

test('deletePayeeAlias — 404 when alias belongs to another user', async ({
  serviceDb,
}) => {
  const owner = await insertUser(serviceDb);
  const stranger = await insertUser(serviceDb);
  const { aliasRow } = await insertPayeeWithAlias(
    serviceDb,
    owner.id,
    'Acme',
    'acme',
  );

  await expect(
    deletePayeeAliasService(asDb(serviceDb), stranger.id, { id: aliasRow.id }),
  ).rejects.toThrow(/alias not found/i);

  const stillThere = await serviceDb
    .select()
    .from(payeeAliases)
    .where(eq(payeeAliases.id, aliasRow.id));
  expect(stillThere).toHaveLength(1);
});

test('deletePayeeAlias — leaves siblings on the same payee and other payees intact', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const { aliasRow: targetAlias, payee: payeeA } = await insertPayeeWithAlias(
    serviceDb,
    user.id,
    'Acme A',
    'acme a',
  );
  const [siblingAlias] = await serviceDb
    .insert(payeeAliases)
    .values({ alias: 'acme alt', createdById: user.id, payeeId: payeeA.id })
    .returning();
  if (!siblingAlias) throw new Error('sibling alias insert returned no row');

  const { aliasRow: otherPayeeAlias, payee: payeeB } =
    await insertPayeeWithAlias(serviceDb, user.id, 'Acme B', 'acme b');

  await deletePayeeAliasService(asDb(serviceDb), user.id, {
    id: targetAlias.id,
  });

  const allRows = await serviceDb.select().from(payeeAliases);
  const liveRows = allRows.filter((r) => r.deletedAt === null);
  const liveIds = liveRows.map((r) => r.id).toSorted();
  expect(liveIds).toEqual([siblingAlias.id, otherPayeeAlias.id].toSorted());

  const targetRow = allRows.find((r) => r.id === targetAlias.id);
  expect(targetRow?.deletedAt).toBeInstanceOf(Date);

  const parentA = await serviceDb
    .select({ deletedAt: payees.deletedAt })
    .from(payees)
    .where(eq(payees.id, payeeA.id));
  expect(parentA[0]?.deletedAt).toBeNull();

  const parentB = await serviceDb
    .select({ deletedAt: payees.deletedAt })
    .from(payees)
    .where(eq(payees.id, payeeB.id));
  expect(parentB[0]?.deletedAt).toBeNull();
});
