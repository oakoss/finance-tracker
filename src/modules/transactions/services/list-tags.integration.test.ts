import { expect } from 'vitest';

import { listTagsService } from '@/modules/transactions/services/list-tags';
import { asDb } from '~test/db';
import { insertTag } from '~test/factories/tag.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

// ---------------------------------------------------------------------------
// listTagsService
// ---------------------------------------------------------------------------

test('listTags — returns active tags ordered by name', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  await insertTag(serviceDb, { name: 'bravo', userId: user.id });
  await insertTag(serviceDb, { name: 'alpha', userId: user.id });

  const rows = await listTagsService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(2);
  expect(rows[0].name).toBe('alpha');
  expect(rows[1].name).toBe('bravo');
});

test('listTags — excludes soft-deleted', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);
  await insertTag(serviceDb, { deletedAt: new Date(), userId: user.id });
  await insertTag(serviceDb, { userId: user.id });

  const rows = await listTagsService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(1);
});

test('listTags — isolates by user', async ({ serviceDb }) => {
  const user1 = await insertUser(serviceDb);
  const user2 = await insertUser(serviceDb);
  await insertTag(serviceDb, { userId: user1.id });
  await insertTag(serviceDb, { userId: user2.id });

  const rows = await listTagsService(asDb(serviceDb), user1.id);

  expect(rows).toHaveLength(1);
});

test('listTags — returns projected columns only', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);
  await insertTag(serviceDb, { userId: user.id });

  const rows = await listTagsService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(1);
  const keys = Object.keys(rows[0]);
  expect(keys).toEqual(['id', 'name']);
});
