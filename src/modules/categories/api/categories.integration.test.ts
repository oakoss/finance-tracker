import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import { categories } from '@/db/schema';
import { parsePgError, throwIfConstraintViolation } from '@/lib/db/pg-error';
import { expectPgError } from '~test/assertions';
import { insertCategoryWithUser } from '~test/factories/category-with-user.factory';
import { insertCategory } from '~test/factories/category.factory';
import { test } from '~test/integration-setup';

// ---------------------------------------------------------------------------
// DB-constraint and schema-level tests
// ---------------------------------------------------------------------------

test('create — rejects duplicate name for same user', async ({ db }) => {
  const { user } = await insertCategoryWithUser(db, {
    category: { name: 'Unique-Name' },
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
  const { user } = await insertCategoryWithUser(db, {
    category: { deletedAt: new Date(), name: 'Gone-Cat' },
  });

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

test('create — throwIfConstraintViolation returns 409 for duplicate category', async ({
  db,
}) => {
  const { user } = await insertCategoryWithUser(db, {
    category: { name: 'Dup-Cat' },
  });

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

test('update — self-parent is allowed at DB level (guard is in service)', async ({
  db,
}) => {
  const { category, user } = await insertCategoryWithUser(db);

  const [updated] = await db
    .update(categories)
    .set({ parentId: category.id, updatedById: user.id })
    .where(and(eq(categories.id, category.id), eq(categories.userId, user.id)))
    .returning();

  expect(updated.parentId).toBe(category.id);
});

test('update — throwIfConstraintViolation on duplicate rename', async ({
  db,
}) => {
  const { user } = await insertCategoryWithUser(db, {
    category: { name: 'Existing' },
  });
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
