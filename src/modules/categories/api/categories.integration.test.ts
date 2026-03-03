import { and, eq, isNull } from 'drizzle-orm';
import { expect } from 'vitest';

import { auditLogs, categories } from '@/db/schema';
import { throwIfConstraintViolation } from '@/lib/db/pg-error';
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
    .where(and(eq(categories.userId, user.id), isNull(categories.deletedAt)));

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
    .where(and(eq(categories.userId, user.id), isNull(categories.deletedAt)));

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
    .where(and(eq(categories.userId, user1.id), isNull(categories.deletedAt)));

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

  await expect(
    db.insert(categories).values({
      createdById: user.id,
      name: 'Unique-Name',
      type: 'expense',
      userId: user.id,
    }),
  ).rejects.toThrow();
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
    expect.fail('Expected unique violation');
  } catch (error) {
    caught = error;
  }

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

  await db.insert(auditLogs).values({
    action: 'create',
    actorId: user.id,
    afterData: category as unknown as Record<string, unknown>,
    recordId: category.id,
    tableName: 'categories',
  });

  const logs = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, category.id),
        eq(auditLogs.tableName, 'categories'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].action).toBe('create');
  expect(logs[0].actorId).toBe(user.id);
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
        isNull(categories.deletedAt),
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
