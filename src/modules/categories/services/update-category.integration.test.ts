import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { updateCategoryService } from '@/modules/categories/services/update-category';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertCategoryWithUser } from '~test/factories/category-with-user.factory';
import { insertCategory } from '~test/factories/category.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('update — updates fields', async ({ serviceDb }) => {
  const { category, user } = await insertCategoryWithUser(serviceDb, {
    category: { name: 'Old Name' },
  });

  const updated = await updateCategoryService(asDb(serviceDb), user.id, {
    id: category.id,
    name: 'New Name',
  });

  expect(updated.name).toBe('New Name');
});

test('update — rejects nonexistent id', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  await expect(
    updateCategoryService(asDb(serviceDb), user.id, {
      id: fakeId(),
      name: 'Ghost',
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — rejects non-owner', async ({ serviceDb }) => {
  const { category } = await insertCategoryWithUser(serviceDb);
  const other = await insertUser(serviceDb);

  await expect(
    updateCategoryService(asDb(serviceDb), other.id, {
      id: category.id,
      name: 'Hacked',
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — rejects soft-deleted category', async ({ serviceDb }) => {
  const { category, user } = await insertCategoryWithUser(serviceDb, {
    category: { deletedAt: new Date() },
  });

  await expect(
    updateCategoryService(asDb(serviceDb), user.id, {
      id: category.id,
      name: 'Ghost',
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — rejects self-parent', async ({ serviceDb }) => {
  const { category, user } = await insertCategoryWithUser(serviceDb);

  await expect(
    updateCategoryService(asDb(serviceDb), user.id, {
      id: category.id,
      parentId: category.id,
    }),
  ).rejects.toMatchObject({ status: 422 });
});

test('update — rejects parentId owned by another user', async ({
  serviceDb,
}) => {
  const { category, user } = await insertCategoryWithUser(serviceDb);
  const { category: otherParent } = await insertCategoryWithUser(serviceDb);

  await expect(
    updateCategoryService(asDb(serviceDb), user.id, {
      id: category.id,
      parentId: otherParent.id,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — rejects soft-deleted parentId', async ({ serviceDb }) => {
  const { category, user } = await insertCategoryWithUser(serviceDb);
  const deletedParent = await insertCategory(serviceDb, {
    deletedAt: new Date(),
    name: 'Deleted Parent',
    userId: user.id,
  });

  await expect(
    updateCategoryService(asDb(serviceDb), user.id, {
      id: category.id,
      parentId: deletedParent.id,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — clearing parentId to null demotes to root', async ({
  serviceDb,
}) => {
  const { category: parent, user } = await insertCategoryWithUser(serviceDb, {
    category: { name: 'Parent Cat' },
  });
  const child = await insertCategory(serviceDb, {
    name: 'Child Cat',
    parentId: parent.id,
    userId: user.id,
  });

  const updated = await updateCategoryService(asDb(serviceDb), user.id, {
    id: child.id,
    parentId: null,
  });

  expect(updated.parentId).toBeNull();
});

test('update — writes audit log with before/after', async ({ serviceDb }) => {
  const { category, user } = await insertCategoryWithUser(serviceDb);

  await updateCategoryService(asDb(serviceDb), user.id, {
    id: category.id,
    name: 'Updated',
  });

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, category.id),
        eq(auditLogs.tableName, 'categories'),
        eq(auditLogs.action, 'update'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].actorId).toBe(user.id);
});
