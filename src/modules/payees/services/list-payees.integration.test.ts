import { expect } from 'vitest';

import type { Db } from '@/db';

import { listPayeesService } from '@/modules/payees/services/list-payees';
import type { Db as TestDb } from '~test/factories/base';
import { insertPayee } from '~test/factories/payee.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

/**
 * Cast test Db to app Db. Safe because PgTransaction extends PgDatabase
 * at runtime — all query/mutation methods are available.
 */
const asDb = (db: TestDb) => db as unknown as Db;

// ---------------------------------------------------------------------------
// listPayeesService
// ---------------------------------------------------------------------------

test('listPayees — returns active payees ordered by name', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  await insertPayee(serviceDb, { name: 'Bravo', userId: user.id });
  await insertPayee(serviceDb, { name: 'Alpha', userId: user.id });

  const rows = await listPayeesService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(2);
  expect(rows[0].name).toBe('Alpha');
  expect(rows[1].name).toBe('Bravo');
});

test('listPayees — excludes soft-deleted', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);
  await insertPayee(serviceDb, { deletedAt: new Date(), userId: user.id });
  await insertPayee(serviceDb, { userId: user.id });

  const rows = await listPayeesService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(1);
});

test('listPayees — isolates by user', async ({ serviceDb }) => {
  const user1 = await insertUser(serviceDb);
  const user2 = await insertUser(serviceDb);
  await insertPayee(serviceDb, { userId: user1.id });
  await insertPayee(serviceDb, { userId: user2.id });

  const rows = await listPayeesService(asDb(serviceDb), user1.id);

  expect(rows).toHaveLength(1);
});

test('listPayees — returns projected columns only', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);
  await insertPayee(serviceDb, { userId: user.id });

  const rows = await listPayeesService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(1);
  const keys = Object.keys(rows[0]);
  expect(keys).toEqual(['id', 'name']);
});
