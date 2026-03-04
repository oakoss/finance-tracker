import { and, asc, eq, getTableName } from 'drizzle-orm';
import { expect } from 'vitest';

import { categories } from '@/db/schema';
import { notDeleted } from '@/lib/audit/soft-delete';
import { parsePgError, throwIfConstraintViolation } from '@/lib/db/pg-error';
import { expectAuditLogEntry, expectPgError } from '~test/assertions';
import { insertCategory } from '~test/factories/category.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

// ---------------------------------------------------------------------------
// List categories
// ---------------------------------------------------------------------------

test('list — returns active categories for user', async ({ db }) => {
  const user = await insertUser(db);
  const category = await insertCategory(db, {
    type: 'expense',
    userId: user.id,
  });

  const rows = await db
    .select()
    .from(categories)
    .where(
      and(eq(categories.userId, user.id), notDeleted(categories.deletedAt)),
    );

  expect(rows).toHaveLength(1);
  expect(rows[0].name).toBe(category.name);
});

test('list — excludes soft-deleted', async ({ db }) => {
  const user = await insertUser(db);
  await insertCategory(db, {
    deletedAt: new Date(),
    userId: user.id,
  });
  await insertCategory(db, { userId: user.id });

  const rows = await db
    .select()
    .from(categories)
    .where(
      and(eq(categories.userId, user.id), notDeleted(categories.deletedAt)),
    );

  expect(rows).toHaveLength(1);
});

test('list — isolates by user', async ({ db }) => {
  const user1 = await insertUser(db);
  const user2 = await insertUser(db);
  await insertCategory(db, { userId: user1.id });
  await insertCategory(db, { userId: user2.id });

  const rows = await db
    .select()
    .from(categories)
    .where(
      and(eq(categories.userId, user1.id), notDeleted(categories.deletedAt)),
    );

  expect(rows).toHaveLength(1);
  expect(rows[0].userId).toBe(user1.id);
});

// ---------------------------------------------------------------------------
// Create category
// ---------------------------------------------------------------------------

test('create — inserts with required fields', async ({ db }) => {
  const user = await insertUser(db);

  const [category] = await db
    .insert(categories)
    .values({
      createdById: user.id,
      name: 'Groceries',
      type: 'expense',
      userId: user.id,
    })
    .returning();

  expect(category.id).toBeDefined();
  expect(category.name).toBe('Groceries');
  expect(category.type).toBe('expense');
  expect(category.parentId).toBeNull();
});

test('create — inserts child with parentId', async ({ db }) => {
  const user = await insertUser(db);
  const parent = await insertCategory(db, {
    name: 'Food',
    type: 'expense',
    userId: user.id,
  });

  const [child] = await db
    .insert(categories)
    .values({
      createdById: user.id,
      name: 'Fast Food',
      parentId: parent.id,
      type: 'expense',
      userId: user.id,
    })
    .returning();

  expect(child.parentId).toBe(parent.id);
});

test('create — rejects duplicate name for same user', async ({ db }) => {
  const user = await insertUser(db);
  await insertCategory(db, {
    name: 'Unique-Name',
    userId: user.id,
  });

  await expectPgError(
    () =>
      db.insert(categories).values({
        createdById: user.id,
        name: 'Unique-Name',
        type: 'expense',
        userId: user.id,
      }),
    { code: '23505', constraint: 'categories_user_name_idx' },
  );
});

test('create — re-creates after soft-delete (partial index)', async ({
  db,
}) => {
  const user = await insertUser(db);
  await insertCategory(db, {
    deletedAt: new Date(),
    name: 'Gone-Cat',
    userId: user.id,
  });

  // Partial unique index allows re-creation with the same name
  const [fresh] = await db
    .insert(categories)
    .values({
      createdById: user.id,
      name: 'Gone-Cat',
      type: 'expense',
      userId: user.id,
    })
    .returning();

  expect(fresh.name).toBe('Gone-Cat');
  expect(fresh.deletedAt).toBeNull();
});

test('create — throwIfConstraintViolation returns 409 with fix message for duplicate category', async ({
  db,
}) => {
  const user = await insertUser(db);
  await insertCategory(db, { name: 'Dup-Cat', userId: user.id });

  let caught: unknown;
  try {
    await db.insert(categories).values({
      createdById: user.id,
      name: 'Dup-Cat',
      type: 'expense',
      userId: user.id,
    });
  } catch (error) {
    caught = error;
  }

  if (caught === undefined) {
    expect.fail('Expected a Postgres constraint violation');
  }

  const pgInfo = parsePgError(caught);
  expect(pgInfo).not.toBeNull();
  expect(pgInfo!.constraint).toBe('categories_user_name_idx');

  expect(() => throwIfConstraintViolation(caught, 'category.create')).toThrow(
    expect.objectContaining({
      fix: 'A category with this name already exists.',
      status: 409,
    }),
  );
});

test('create — writes audit log', async ({ db }) => {
  const user = await insertUser(db);

  const [category] = await db
    .insert(categories)
    .values({
      createdById: user.id,
      name: 'Audit Test',
      type: 'income',
      userId: user.id,
    })
    .returning();

  await expectAuditLogEntry(db, {
    action: 'create',
    actorId: user.id,
    afterData: category as unknown as Record<string, unknown>,
    recordId: category.id,
    tableName: getTableName(categories),
  });
});

test('create — rejects parentId owned by another user', async ({ db }) => {
  const user1 = await insertUser(db);
  const user2 = await insertUser(db);
  const otherParent = await insertCategory(db, {
    name: 'Other Parent',
    userId: user2.id,
  });

  // Mirrors server fn: lookup parent by id + userId + notDeleted
  const parent = await db.query.categories.findFirst({
    where: (t, { and: a, eq: e }) =>
      a(
        e(t.id, otherParent.id),
        e(t.userId, user1.id),
        notDeleted(t.deletedAt),
      ),
  });

  expect(parent).toBeUndefined();
});

test('create — rejects soft-deleted parentId', async ({ db }) => {
  const user = await insertUser(db);
  const deletedParent = await insertCategory(db, {
    deletedAt: new Date(),
    name: 'Deleted Parent',
    userId: user.id,
  });

  const parent = await db.query.categories.findFirst({
    where: (t, { and: a, eq: e }) =>
      a(
        e(t.id, deletedParent.id),
        e(t.userId, user.id),
        notDeleted(t.deletedAt),
      ),
  });

  expect(parent).toBeUndefined();
});

// ---------------------------------------------------------------------------
// Update category
// ---------------------------------------------------------------------------

test('update — updates fields', async ({ db }) => {
  const user = await insertUser(db);
  const category = await insertCategory(db, {
    name: 'Old Name',
    userId: user.id,
  });

  const [updated] = await db
    .update(categories)
    .set({ name: 'New Name', updatedById: user.id })
    .where(and(eq(categories.id, category.id), eq(categories.userId, user.id)))
    .returning();

  expect(updated.name).toBe('New Name');
});

test('update — rejects non-owner', async ({ db }) => {
  const owner = await insertUser(db);
  const other = await insertUser(db);
  const category = await insertCategory(db, { userId: owner.id });

  const result = await db
    .update(categories)
    .set({ name: 'Hacked' })
    .where(and(eq(categories.id, category.id), eq(categories.userId, other.id)))
    .returning();

  expect(result).toHaveLength(0);
});

test('update — self-parent is allowed at DB level (guard is in server fn)', async ({
  db,
}) => {
  const user = await insertUser(db);
  const category = await insertCategory(db, { userId: user.id });

  // The server fn rejects parentId === id with a 422 before any DB write.
  // At the DB level, no constraint prevents self-reference.
  const [updated] = await db
    .update(categories)
    .set({ parentId: category.id, updatedById: user.id })
    .where(and(eq(categories.id, category.id), eq(categories.userId, user.id)))
    .returning();

  expect(updated.parentId).toBe(category.id);
});

test('update — rejects parentId owned by another user', async ({ db }) => {
  const user1 = await insertUser(db);
  const user2 = await insertUser(db);
  const otherParent = await insertCategory(db, {
    name: 'Other User Parent',
    userId: user2.id,
  });

  const parent = await db.query.categories.findFirst({
    where: (t, { and: a, eq: e }) =>
      a(
        e(t.id, otherParent.id),
        e(t.userId, user1.id),
        notDeleted(t.deletedAt),
      ),
  });

  expect(parent).toBeUndefined();
});

test('update — rejects soft-deleted parentId', async ({ db }) => {
  const user = await insertUser(db);
  const deletedParent = await insertCategory(db, {
    deletedAt: new Date(),
    name: 'Deleted Update Parent',
    userId: user.id,
  });

  const parent = await db.query.categories.findFirst({
    where: (t, { and: a, eq: e }) =>
      a(
        e(t.id, deletedParent.id),
        e(t.userId, user.id),
        notDeleted(t.deletedAt),
      ),
  });

  expect(parent).toBeUndefined();
});

test('update — clearing parentId to null demotes to root', async ({ db }) => {
  const user = await insertUser(db);
  const parent = await insertCategory(db, {
    name: 'Parent Cat',
    userId: user.id,
  });
  const child = await insertCategory(db, {
    name: 'Child Cat',
    parentId: parent.id,
    userId: user.id,
  });

  expect(child.parentId).toBe(parent.id);

  const [updated] = await db
    .update(categories)
    .set({ parentId: null, updatedById: user.id })
    .where(and(eq(categories.id, child.id), eq(categories.userId, user.id)))
    .returning();

  expect(updated.parentId).toBeNull();
});

test('update — throwIfConstraintViolation on duplicate rename', async ({
  db,
}) => {
  const user = await insertUser(db);
  await insertCategory(db, { name: 'Existing', userId: user.id });
  const category = await insertCategory(db, {
    name: 'To Rename',
    userId: user.id,
  });

  let caught: unknown;
  try {
    await db
      .update(categories)
      .set({ name: 'Existing', updatedById: user.id })
      .where(
        and(eq(categories.id, category.id), eq(categories.userId, user.id)),
      );
  } catch (error) {
    caught = error;
  }

  if (caught === undefined) {
    expect.fail('Expected a Postgres constraint violation');
  }

  expect(() => throwIfConstraintViolation(caught, 'category.update')).toThrow(
    expect.objectContaining({
      fix: 'A category with this name already exists.',
      status: 409,
    }),
  );
});

test('update — soft-deleted category returns zero rows', async ({ db }) => {
  const user = await insertUser(db);
  const category = await insertCategory(db, {
    deletedAt: new Date(),
    userId: user.id,
  });

  const result = await db
    .update(categories)
    .set({ name: 'Ghost', updatedById: user.id })
    .where(
      and(
        eq(categories.id, category.id),
        eq(categories.userId, user.id),
        notDeleted(categories.deletedAt),
      ),
    )
    .returning();

  expect(result).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Delete category (soft delete)
// ---------------------------------------------------------------------------

test('delete — soft deletes', async ({ db }) => {
  const user = await insertUser(db);
  const category = await insertCategory(db, { userId: user.id });

  await db
    .update(categories)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(and(eq(categories.id, category.id), eq(categories.userId, user.id)));

  const [deleted] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, category.id));

  expect(deleted.deletedAt).toBeInstanceOf(Date);
  expect(deleted.deletedById).toBe(user.id);
});

test('delete — nullifies children parentId on soft delete', async ({ db }) => {
  const user = await insertUser(db);
  const parent = await insertCategory(db, {
    name: 'Parent',
    userId: user.id,
  });
  const child = await insertCategory(db, {
    name: 'Child',
    parentId: parent.id,
    userId: user.id,
  });

  await db
    .update(categories)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(and(eq(categories.id, parent.id), eq(categories.userId, user.id)));

  // Mirror the server function's child-orphaning step
  await db
    .update(categories)
    .set({ parentId: null, updatedById: user.id })
    .where(
      and(
        eq(categories.parentId, parent.id),
        eq(categories.userId, user.id),
        notDeleted(categories.deletedAt),
      ),
    );

  const [updatedChild] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, child.id));

  expect(updatedChild.parentId).toBeNull();
});

test('delete — rejects non-owner', async ({ db }) => {
  const owner = await insertUser(db);
  const other = await insertUser(db);
  const category = await insertCategory(db, { userId: owner.id });

  const result = await db
    .update(categories)
    .set({ deletedAt: new Date(), deletedById: other.id })
    .where(and(eq(categories.id, category.id), eq(categories.userId, other.id)))
    .returning();

  expect(result).toHaveLength(0);

  const [unchanged] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, category.id));

  expect(unchanged.deletedAt).toBeNull();
});

test('delete — orphan promotion skips soft-deleted children', async ({
  db,
}) => {
  const user = await insertUser(db);
  const parent = await insertCategory(db, {
    name: 'Parent To Delete',
    userId: user.id,
  });
  const activeChild = await insertCategory(db, {
    name: 'Active Child',
    parentId: parent.id,
    userId: user.id,
  });
  const deletedChild = await insertCategory(db, {
    deletedAt: new Date(),
    name: 'Deleted Child',
    parentId: parent.id,
    userId: user.id,
  });

  await db
    .update(categories)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(and(eq(categories.id, parent.id), eq(categories.userId, user.id)));

  // Mirrors deleteCategory orphan-promotion step
  await db
    .update(categories)
    .set({ parentId: null, updatedById: user.id })
    .where(
      and(
        eq(categories.parentId, parent.id),
        eq(categories.userId, user.id),
        notDeleted(categories.deletedAt),
      ),
    );

  const [active] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, activeChild.id));
  const [deleted] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, deletedChild.id));

  expect(active.parentId).toBeNull();
  // Soft-deleted child retains parentId (notDeleted filter excluded it)
  expect(deleted.parentId).toBe(parent.id);
});

test('delete — writes audit log', async ({ db }) => {
  const user = await insertUser(db);
  const category = await insertCategory(db, { userId: user.id });

  await db
    .update(categories)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(and(eq(categories.id, category.id), eq(categories.userId, user.id)));

  await expectAuditLogEntry(db, {
    action: 'delete',
    actorId: user.id,
    beforeData: category as unknown as Record<string, unknown>,
    recordId: category.id,
    tableName: getTableName(categories),
  });
});

// ---------------------------------------------------------------------------
// List categories — ordering and projection
// ---------------------------------------------------------------------------

test('list — ordered by type ASC, name ASC', async ({ db }) => {
  const user = await insertUser(db);
  await insertCategory(db, {
    name: 'Zebra',
    type: 'expense',
    userId: user.id,
  });
  await insertCategory(db, {
    name: 'Alpha',
    type: 'income',
    userId: user.id,
  });
  await insertCategory(db, {
    name: 'Apple',
    type: 'expense',
    userId: user.id,
  });

  const rows = await db
    .select()
    .from(categories)
    .where(
      and(eq(categories.userId, user.id), notDeleted(categories.deletedAt)),
    )
    .orderBy(asc(categories.type), asc(categories.name));

  expect(rows).toHaveLength(3);
  // PG enum order: income < expense < transfer
  expect(rows[0].type).toBe('income');
  expect(rows[0].name).toBe('Alpha');
  expect(rows[1].type).toBe('expense');
  expect(rows[1].name).toBe('Apple');
  expect(rows[2].type).toBe('expense');
  expect(rows[2].name).toBe('Zebra');
});

test('list — returns projected columns only', async ({ db }) => {
  const user = await insertUser(db);
  await insertCategory(db, {
    type: 'expense',
    userId: user.id,
  });

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      parentId: categories.parentId,
      type: categories.type,
    })
    .from(categories)
    .where(
      and(eq(categories.userId, user.id), notDeleted(categories.deletedAt)),
    );

  expect(rows).toHaveLength(1);
  const keys = Object.keys(rows[0]);
  expect(keys).toEqual(['id', 'name', 'parentId', 'type']);
});
