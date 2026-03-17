import { expect } from 'vitest';

import { categories } from '@/db/schema';
import { insertCategory } from '~test/factories/category.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

import { parsePgError } from './pg-error';

test('parsePgError extracts fields from a real PG unique violation', async ({
  db,
}) => {
  const user = await insertUser(db);
  await insertCategory(db, { name: 'Duplicate', userId: user.id });

  let caught: unknown;
  try {
    await db
      .insert(categories)
      .values({
        createdById: user.id,
        name: 'Duplicate',
        type: 'expense',
        userId: user.id,
      });
    expect.fail('Expected unique violation to be thrown');
  } catch (error) {
    caught = error;
  }

  const parsed = parsePgError(caught);
  expect(parsed).not.toBeNull();
  expect(parsed!.code).toBe('23505');
  expect(parsed!.constraint).toBe('categories_user_name_idx');
  expect(parsed!.table).toBe('categories');
});
