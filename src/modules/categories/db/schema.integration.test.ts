import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import { categories } from '@/db/schema';
import { expectPgError } from '~test/assertions';
import { insertCategoryWithUser } from '~test/factories/category-with-user.factory';
import { test } from '~test/integration-setup';

// ---------------------------------------------------------------------------
// DB constraint tests — schema-level, not service-level
// ---------------------------------------------------------------------------

test('categories — rejects duplicate name for same user', async ({ db }) => {
  const { user } = await insertCategoryWithUser(db, {
    category: { name: 'Unique-Name' },
  });

  await expectPgError(
    () =>
      db
        .insert(categories)
        .values({
          createdById: user.id,
          name: 'Unique-Name',
          type: 'expense',
          userId: user.id,
        }),
    { code: '23505', constraint: 'categories_user_name_idx' },
  );
});

test('categories — re-creates after soft-delete (partial index)', async ({
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

test('categories — self-parent is allowed at DB level (guard is in service)', async ({
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
