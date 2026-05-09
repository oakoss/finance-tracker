import { eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { payees } from '@/modules/payees/db/schema';
import { listPayeeAliasesService } from '@/modules/payees/services/list-payee-aliases';
import { payeeAliases } from '@/modules/rules/db/schema';
import type { Db as TestDb } from '~test/factories/base';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

async function insertPayee(db: TestDb, userId: string, name: string) {
  const [payee] = await db
    .insert(payees)
    .values({
      createdById: userId,
      name,
      normalizedName: name.toLowerCase(),
      userId,
    })
    .returning();
  if (!payee) throw new Error('payee insert returned no row');
  return payee;
}

test('listPayeeAliases — returns aliases sorted alphabetically', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const payee = await insertPayee(serviceDb, user.id, 'Acme');

  await serviceDb.insert(payeeAliases).values([
    { alias: 'zeta', createdById: user.id, payeeId: payee.id },
    { alias: 'alpha', createdById: user.id, payeeId: payee.id },
    { alias: 'mu', createdById: user.id, payeeId: payee.id },
  ]);

  const aliases = await listPayeeAliasesService(asDb(serviceDb), user.id, {
    payeeId: payee.id,
  });

  expect(aliases.map((a) => a.alias)).toEqual(['alpha', 'mu', 'zeta']);
});

test('listPayeeAliases — returns empty array when no aliases', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const payee = await insertPayee(serviceDb, user.id, 'Acme');

  const aliases = await listPayeeAliasesService(asDb(serviceDb), user.id, {
    payeeId: payee.id,
  });

  expect(aliases).toEqual([]);
});

test('listPayeeAliases — 404 when payee belongs to another user', async ({
  serviceDb,
}) => {
  const owner = await insertUser(serviceDb);
  const stranger = await insertUser(serviceDb);
  const payee = await insertPayee(serviceDb, owner.id, 'Acme');

  await expect(
    listPayeeAliasesService(asDb(serviceDb), stranger.id, {
      payeeId: payee.id,
    }),
  ).rejects.toThrow(/payee not found/i);
});

test('listPayeeAliases — 404 when payee is soft-deleted', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const payee = await insertPayee(serviceDb, user.id, 'Acme');
  await serviceDb
    .update(payees)
    .set({ deletedAt: new Date() })
    .where(eq(payees.id, payee.id));

  await expect(
    listPayeeAliasesService(asDb(serviceDb), user.id, { payeeId: payee.id }),
  ).rejects.toThrow(/payee not found/i);
});

test('listPayeeAliases — filters out soft-deleted aliases', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const payee = await insertPayee(serviceDb, user.id, 'Acme');

  const inserted = await serviceDb
    .insert(payeeAliases)
    .values([
      { alias: 'live', createdById: user.id, payeeId: payee.id },
      { alias: 'tombstone', createdById: user.id, payeeId: payee.id },
    ])
    .returning();
  const tombstone = inserted.find((r) => r.alias === 'tombstone');
  if (!tombstone) throw new Error('tombstone insert returned no row');

  await serviceDb
    .update(payeeAliases)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(eq(payeeAliases.id, tombstone.id));

  const aliases = await listPayeeAliasesService(asDb(serviceDb), user.id, {
    payeeId: payee.id,
  });

  expect(aliases.map((a) => a.alias)).toEqual(['live']);
});
