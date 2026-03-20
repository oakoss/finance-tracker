import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { notDeleted } from '@/lib/audit/soft-delete';
import { categories } from '@/modules/categories/db/schema';
import { deleteCategoryService } from '@/modules/categories/services/delete-category';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertCategoryWithUser } from '~test/factories/category-with-user.factory';
import { insertCategory } from '~test/factories/category.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('delete — soft-deletes category', async ({ serviceDb }) => {
  const { category, user } = await insertCategoryWithUser(serviceDb);

  await deleteCategoryService(asDb(serviceDb), user.id, { id: category.id });

  const rows = await serviceDb
    .select()
    .from(categories)
    .where(
      and(eq(categories.id, category.id), notDeleted(categories.deletedAt)),
    );

  expect(rows).toHaveLength(0);
});

test('delete — nullifies children parentId', async ({ serviceDb }) => {
  const { category: parent, user } = await insertCategoryWithUser(serviceDb, {
    category: { name: 'Parent' },
  });
  const child = await insertCategory(serviceDb, {
    name: 'Child',
    parentId: parent.id,
    userId: user.id,
  });

  await deleteCategoryService(asDb(serviceDb), user.id, { id: parent.id });

  const [updatedChild] = await serviceDb
    .select()
    .from(categories)
    .where(eq(categories.id, child.id));

  expect(updatedChild.parentId).toBeNull();
});

test('delete — orphan promotion skips soft-deleted children', async ({
  serviceDb,
}) => {
  const { category: parent, user } = await insertCategoryWithUser(serviceDb, {
    category: { name: 'Parent To Delete' },
  });
  const activeChild = await insertCategory(serviceDb, {
    name: 'Active Child',
    parentId: parent.id,
    userId: user.id,
  });
  const deletedChild = await insertCategory(serviceDb, {
    deletedAt: new Date(),
    name: 'Deleted Child',
    parentId: parent.id,
    userId: user.id,
  });

  await deleteCategoryService(asDb(serviceDb), user.id, { id: parent.id });

  const [active] = await serviceDb
    .select()
    .from(categories)
    .where(eq(categories.id, activeChild.id));
  const [deleted] = await serviceDb
    .select()
    .from(categories)
    .where(eq(categories.id, deletedChild.id));

  expect(active.parentId).toBeNull();
  expect(deleted.parentId).toBe(parent.id);
});

test('delete — rejects nonexistent id', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  await expect(
    deleteCategoryService(asDb(serviceDb), user.id, { id: fakeId() }),
  ).rejects.toMatchObject({ status: 404 });
});

test('delete — rejects non-owner', async ({ serviceDb }) => {
  const { category } = await insertCategoryWithUser(serviceDb);
  const other = await insertUser(serviceDb);

  await expect(
    deleteCategoryService(asDb(serviceDb), other.id, { id: category.id }),
  ).rejects.toMatchObject({ status: 404 });
});

test('delete — rejects already-soft-deleted', async ({ serviceDb }) => {
  const { category, user } = await insertCategoryWithUser(serviceDb, {
    category: { deletedAt: new Date() },
  });

  await expect(
    deleteCategoryService(asDb(serviceDb), user.id, { id: category.id }),
  ).rejects.toMatchObject({ status: 404 });
});

test('delete — writes audit log', async ({ serviceDb }) => {
  const { category, user } = await insertCategoryWithUser(serviceDb);

  await deleteCategoryService(asDb(serviceDb), user.id, { id: category.id });

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, category.id),
        eq(auditLogs.tableName, 'categories'),
        eq(auditLogs.action, 'delete'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].actorId).toBe(user.id);
});
