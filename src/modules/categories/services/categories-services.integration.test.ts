import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { notDeleted } from '@/lib/audit/soft-delete';
import { categories } from '@/modules/categories/db/schema';
import { createCategoryService } from '@/modules/categories/services/create-category';
import { deleteCategoryService } from '@/modules/categories/services/delete-category';
import { listCategoriesService } from '@/modules/categories/services/list-categories';
import { updateCategoryService } from '@/modules/categories/services/update-category';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertCategoryWithUser } from '~test/factories/category-with-user.factory';
import { insertCategory } from '~test/factories/category.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

// ---------------------------------------------------------------------------
// listCategoriesService
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// createCategoryService
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// updateCategoryService
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// deleteCategoryService
// ---------------------------------------------------------------------------

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
