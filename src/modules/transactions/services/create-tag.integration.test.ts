import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import { notDeleted } from '@/lib/audit/soft-delete';
import { tags } from '@/modules/transactions/db/schema';
import { createTagService } from '@/modules/transactions/services/create-tag';
import { asDb } from '~test/db';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

// ---------------------------------------------------------------------------
// createTagService
// ---------------------------------------------------------------------------

test('createTag — inserts with name', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const tag = await createTagService(asDb(serviceDb), user.id, {
    name: 'expenses',
  });

  expect(tag.id).toBeDefined();
  expect(tag.name).toBe('expenses');
  expect(tag.userId).toBe(user.id);
});

test('createTag — stores trimmed name', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const tag = await createTagService(asDb(serviceDb), user.id, {
    name: '  spaced  ',
  });

  expect(tag.name).toBe('spaced');
});

test('createTag — dedup returns existing on exact match', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  const first = await createTagService(asDb(serviceDb), user.id, {
    name: 'groceries',
  });
  const second = await createTagService(asDb(serviceDb), user.id, {
    name: 'groceries',
  });

  expect(first.id).toBe(second.id);

  const rows = await serviceDb
    .select()
    .from(tags)
    .where(
      and(
        eq(tags.name, 'groceries'),
        eq(tags.userId, user.id),
        notDeleted(tags.deletedAt),
      ),
    );
  expect(rows).toHaveLength(1);
});

test('createTag — dedup is case-sensitive', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const lower = await createTagService(asDb(serviceDb), user.id, {
    name: 'groceries',
  });
  const upper = await createTagService(asDb(serviceDb), user.id, {
    name: 'Groceries',
  });

  expect(lower.id).not.toBe(upper.id);
});
