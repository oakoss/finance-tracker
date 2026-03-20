import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { createCategoryService } from '@/modules/categories/services/create-category';
import type { Db as TestDb } from '~test/factories/base';
import { insertCategoryWithUser } from '~test/factories/category-with-user.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('create — inserts with required fields', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const result = await createCategoryService(asDb(serviceDb), user.id, {
    name: 'Groceries',
    type: 'expense',
  });

  expect(result.id).toBeDefined();
  expect(result.name).toBe('Groceries');
  expect(result.type).toBe('expense');
  expect(result.parentId).toBeNull();
});

test('create — inserts child with parentId', async ({ serviceDb }) => {
  const { category: parent, user } = await insertCategoryWithUser(serviceDb, {
    category: { name: 'Food', type: 'expense' },
  });

  const child = await createCategoryService(asDb(serviceDb), user.id, {
    name: 'Fast Food',
    parentId: parent.id,
    type: 'expense',
  });

  expect(child.parentId).toBe(parent.id);
});

test('create — rejects parentId owned by another user', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const { category: otherParent } = await insertCategoryWithUser(serviceDb);

  await expect(
    createCategoryService(asDb(serviceDb), user.id, {
      name: 'Orphan',
      parentId: otherParent.id,
      type: 'expense',
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('create — rejects soft-deleted parentId', async ({ serviceDb }) => {
  const { category: deletedParent, user } = await insertCategoryWithUser(
    serviceDb,
    { category: { deletedAt: new Date() } },
  );

  await expect(
    createCategoryService(asDb(serviceDb), user.id, {
      name: 'Orphan',
      parentId: deletedParent.id,
      type: 'expense',
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('create — writes audit log', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const result = await createCategoryService(asDb(serviceDb), user.id, {
    name: 'Audit Test',
    type: 'income',
  });

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, result.id),
        eq(auditLogs.tableName, 'categories'),
        eq(auditLogs.action, 'create'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].actorId).toBe(user.id);
});
