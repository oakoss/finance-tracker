import { expect } from 'vitest';

import type { Db } from '@/db';

import { listCategoriesService } from '@/modules/categories/services/list-categories';
import type { Db as TestDb } from '~test/factories/base';
import { insertCategoryWithUser } from '~test/factories/category-with-user.factory';
import { insertCategory } from '~test/factories/category.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('list — returns active categories for user', async ({ serviceDb }) => {
  const { user } = await insertCategoryWithUser(serviceDb, {
    category: { type: 'expense' },
  });

  const rows = await listCategoriesService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(1);
  expect(rows[0].type).toBe('expense');
});

test('list — excludes soft-deleted', async ({ serviceDb }) => {
  const { user } = await insertCategoryWithUser(serviceDb, {
    category: { deletedAt: new Date() },
  });
  await insertCategory(serviceDb, { userId: user.id });

  const rows = await listCategoriesService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(1);
});

test('list — isolates by user', async ({ serviceDb }) => {
  const { user: user1 } = await insertCategoryWithUser(serviceDb);
  await insertCategoryWithUser(serviceDb);

  const rows = await listCategoriesService(asDb(serviceDb), user1.id);

  expect(rows).toHaveLength(1);
});

test('list — ordered by type ASC, name ASC', async ({ serviceDb }) => {
  const { user } = await insertCategoryWithUser(serviceDb, {
    category: { name: 'Zebra', type: 'expense' },
  });
  await insertCategory(serviceDb, {
    name: 'Alpha',
    type: 'income',
    userId: user.id,
  });
  await insertCategory(serviceDb, {
    name: 'Apple',
    type: 'expense',
    userId: user.id,
  });

  const rows = await listCategoriesService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(3);
  expect(rows[0].type).toBe('income');
  expect(rows[0].name).toBe('Alpha');
  expect(rows[1].type).toBe('expense');
  expect(rows[1].name).toBe('Apple');
  expect(rows[2].type).toBe('expense');
  expect(rows[2].name).toBe('Zebra');
});

test('list — returns projected columns only', async ({ serviceDb }) => {
  const { user } = await insertCategoryWithUser(serviceDb, {
    category: { type: 'expense' },
  });

  const rows = await listCategoriesService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(1);
  const keys = Object.keys(rows[0]);
  expect(keys).toEqual(['id', 'name', 'parentId', 'type']);
});
