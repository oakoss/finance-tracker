import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { notDeleted } from '@/lib/audit/soft-delete';
import { payees, tags } from '@/modules/transactions/db/schema';
import { createPayeeService } from '@/modules/transactions/services/create-payee';
import { createTagService } from '@/modules/transactions/services/create-tag';
import { listPayeesService } from '@/modules/transactions/services/list-payees';
import { listTagsService } from '@/modules/transactions/services/list-tags';
import { type Db as TestDb } from '~test/factories/base';
import { insertPayee } from '~test/factories/payee.factory';
import { insertTag } from '~test/factories/tag.factory';
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

// ---------------------------------------------------------------------------
// listTagsService
// ---------------------------------------------------------------------------

test('listTags — returns active tags ordered by name', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  await insertTag(serviceDb, { name: 'bravo', userId: user.id });
  await insertTag(serviceDb, { name: 'alpha', userId: user.id });

  const rows = await listTagsService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(2);
  expect(rows[0].name).toBe('alpha');
  expect(rows[1].name).toBe('bravo');
});

test('listTags — excludes soft-deleted', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);
  await insertTag(serviceDb, { deletedAt: new Date(), userId: user.id });
  await insertTag(serviceDb, { userId: user.id });

  const rows = await listTagsService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(1);
});

test('listTags — isolates by user', async ({ serviceDb }) => {
  const user1 = await insertUser(serviceDb);
  const user2 = await insertUser(serviceDb);
  await insertTag(serviceDb, { userId: user1.id });
  await insertTag(serviceDb, { userId: user2.id });

  const rows = await listTagsService(asDb(serviceDb), user1.id);

  expect(rows).toHaveLength(1);
});

test('listTags — returns projected columns only', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);
  await insertTag(serviceDb, { userId: user.id });

  const rows = await listTagsService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(1);
  const keys = Object.keys(rows[0]);
  expect(keys).toEqual(['id', 'name']);
});

// ---------------------------------------------------------------------------
// createPayeeService
// ---------------------------------------------------------------------------

test('createPayee — inserts with name', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const payee = await createPayeeService(asDb(serviceDb), user.id, {
    name: 'Acme Corp',
  });

  expect(payee.id).toBeDefined();
  expect(payee.name).toBe('Acme Corp');
  expect(payee.userId).toBe(user.id);
});

test('createPayee — normalizes name to lowercase trimmed', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  const payee = await createPayeeService(asDb(serviceDb), user.id, {
    name: '  Mixed Case  ',
  });

  expect(payee.normalizedName).toBe('mixed case');
  expect(payee.name).toBe('Mixed Case');
});

test('createPayee — dedup returns existing on normalized match', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  const first = await createPayeeService(asDb(serviceDb), user.id, {
    name: 'Acme Corp',
  });
  const second = await createPayeeService(asDb(serviceDb), user.id, {
    name: 'Acme Corp',
  });

  expect(first.id).toBe(second.id);

  const rows = await serviceDb
    .select()
    .from(payees)
    .where(
      and(
        eq(payees.normalizedName, 'acme corp'),
        eq(payees.userId, user.id),
        notDeleted(payees.deletedAt),
      ),
    );
  expect(rows).toHaveLength(1);
});

// ---------------------------------------------------------------------------
// createTagService
// ---------------------------------------------------------------------------

test('createTag — inserts with name', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const tag = await createTagService(asDb(serviceDb), user.id, {
    name: 'expenses',
  });

  expect(tag.id).toBeDefined();
  expect(tag.name).toBe('expenses');
  expect(tag.userId).toBe(user.id);
});

test('createTag — stores trimmed name', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const tag = await createTagService(asDb(serviceDb), user.id, {
    name: '  spaced  ',
  });

  expect(tag.name).toBe('spaced');
});

test('createTag — dedup returns existing on exact match', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  const first = await createTagService(asDb(serviceDb), user.id, {
    name: 'groceries',
  });
  const second = await createTagService(asDb(serviceDb), user.id, {
    name: 'groceries',
  });

  expect(first.id).toBe(second.id);

  const rows = await serviceDb
    .select()
    .from(tags)
    .where(
      and(
        eq(tags.name, 'groceries'),
        eq(tags.userId, user.id),
        notDeleted(tags.deletedAt),
      ),
    );
  expect(rows).toHaveLength(1);
});

test('createTag — dedup is case-sensitive', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const lower = await createTagService(asDb(serviceDb), user.id, {
    name: 'groceries',
  });
  const upper = await createTagService(asDb(serviceDb), user.id, {
    name: 'Groceries',
  });

  expect(lower.id).not.toBe(upper.id);
});
