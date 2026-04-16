import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import { payees, tags } from '@/db/schema';
import { notDeleted } from '@/lib/audit/soft-delete';
import { resolvePayeeId } from '@/modules/payees/lib/resolve-payee';
import { resolveTagIds } from '@/modules/transactions/lib/resolve-tags';
import { fakeId } from '~test/factories/base';
import { insertPayee } from '~test/factories/payee.factory';
import { insertTag } from '~test/factories/tag.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

// ---------------------------------------------------------------------------
// resolvePayeeId
// ---------------------------------------------------------------------------

test('resolvePayeeId — returns null when no payee info provided', async ({
  db,
}) => {
  const user = await insertUser(db);
  const id = await resolvePayeeId(db, { userId: user.id });
  expect(id).toBeNull();
});

test('resolvePayeeId — returns existingPayeeId when no new name', async ({
  db,
}) => {
  const user = await insertUser(db);
  const payee = await insertPayee(db, { userId: user.id });
  const id = await resolvePayeeId(db, {
    existingPayeeId: payee.id,
    userId: user.id,
  });
  expect(id).toBe(payee.id);
});

test('resolvePayeeId — rejects cross-user existingPayeeId', async ({ db }) => {
  const user1 = await insertUser(db);
  const user2 = await insertUser(db);
  const payee = await insertPayee(db, { userId: user2.id });

  await expect(
    resolvePayeeId(db, { existingPayeeId: payee.id, userId: user1.id }),
  ).rejects.toThrow(expect.objectContaining({ status: 404 }));
});

test('resolvePayeeId — rejects soft-deleted existingPayeeId', async ({
  db,
}) => {
  const user = await insertUser(db);
  const payee = await insertPayee(db, {
    deletedAt: new Date(),
    userId: user.id,
  });

  await expect(
    resolvePayeeId(db, { existingPayeeId: payee.id, userId: user.id }),
  ).rejects.toThrow(expect.objectContaining({ status: 404 }));
});

test('resolvePayeeId — rejects nonexistent existingPayeeId', async ({ db }) => {
  const user = await insertUser(db);

  await expect(
    resolvePayeeId(db, { existingPayeeId: fakeId(), userId: user.id }),
  ).rejects.toThrow(expect.objectContaining({ status: 404 }));
});

test('resolvePayeeId — creates new payee', async ({ db }) => {
  const user = await insertUser(db);
  const id = await resolvePayeeId(db, {
    newPayeeName: 'Acme Corp',
    userId: user.id,
  });

  expect(id).toBeDefined();

  const rows = await db
    .select()
    .from(payees)
    .where(and(eq(payees.id, id!), eq(payees.userId, user.id)));
  expect(rows).toHaveLength(1);
  expect(rows[0].name).toBe('Acme Corp');
  expect(rows[0].normalizedName).toBe('acme corp');
});

test('resolvePayeeId — returns same ID on duplicate name (ON CONFLICT)', async ({
  db,
}) => {
  const user = await insertUser(db);
  const id1 = await resolvePayeeId(db, {
    newPayeeName: 'Acme Corp',
    userId: user.id,
  });
  const id2 = await resolvePayeeId(db, {
    newPayeeName: 'Acme Corp',
    userId: user.id,
  });

  expect(id1).toBe(id2);

  const rows = await db
    .select()
    .from(payees)
    .where(
      and(
        eq(payees.name, 'Acme Corp'),
        eq(payees.userId, user.id),
        notDeleted(payees.deletedAt),
      ),
    );
  expect(rows).toHaveLength(1);
});

test('resolvePayeeId — trims whitespace', async ({ db }) => {
  const user = await insertUser(db);
  const id = await resolvePayeeId(db, {
    newPayeeName: '  Padded  ',
    userId: user.id,
  });

  const rows = await db.select().from(payees).where(eq(payees.id, id!));
  expect(rows[0].name).toBe('Padded');
});

// ---------------------------------------------------------------------------
// resolveTagIds
// ---------------------------------------------------------------------------

test('resolveTagIds — returns empty array when no tags', async ({ db }) => {
  const user = await insertUser(db);
  const ids = await resolveTagIds(db, { userId: user.id });
  expect(ids).toEqual([]);
});

test('resolveTagIds — passes through existing tag IDs', async ({ db }) => {
  const user = await insertUser(db);
  const tag = await insertTag(db, { name: 'food', userId: user.id });
  const ids = await resolveTagIds(db, {
    existingTagIds: [tag.id],
    userId: user.id,
  });
  expect(ids).toEqual([tag.id]);
});

test('resolveTagIds — rejects cross-user existingTagIds', async ({ db }) => {
  const user1 = await insertUser(db);
  const user2 = await insertUser(db);
  const tag = await insertTag(db, { name: 'alien', userId: user2.id });

  await expect(
    resolveTagIds(db, { existingTagIds: [tag.id], userId: user1.id }),
  ).rejects.toThrow(expect.objectContaining({ status: 404 }));
});

test('resolveTagIds — rejects soft-deleted existingTagIds', async ({ db }) => {
  const user = await insertUser(db);
  const tag = await insertTag(db, {
    deletedAt: new Date(),
    name: 'gone',
    userId: user.id,
  });

  await expect(
    resolveTagIds(db, { existingTagIds: [tag.id], userId: user.id }),
  ).rejects.toThrow(expect.objectContaining({ status: 404 }));
});

test('resolveTagIds — rejects when any tag in list is cross-user', async ({
  db,
}) => {
  const user1 = await insertUser(db);
  const user2 = await insertUser(db);
  const ownTag = await insertTag(db, { name: 'mine', userId: user1.id });
  const alienTag = await insertTag(db, { name: 'theirs', userId: user2.id });

  await expect(
    resolveTagIds(db, {
      existingTagIds: [ownTag.id, alienTag.id],
      userId: user1.id,
    }),
  ).rejects.toThrow(expect.objectContaining({ status: 404 }));
});

test('resolveTagIds — rejects nonexistent existingTagIds', async ({ db }) => {
  const user = await insertUser(db);

  await expect(
    resolveTagIds(db, { existingTagIds: [fakeId()], userId: user.id }),
  ).rejects.toThrow(expect.objectContaining({ status: 404 }));
});

test('resolveTagIds — deduplicates existingTagIds before ownership check', async ({
  db,
}) => {
  const user = await insertUser(db);
  const tag = await insertTag(db, { name: 'dup-test', userId: user.id });

  const ids = await resolveTagIds(db, {
    existingTagIds: [tag.id, tag.id],
    userId: user.id,
  });

  expect(ids).toContain(tag.id);
});

test('resolveTagIds — creates multiple new tags in one call', async ({
  db,
}) => {
  const user = await insertUser(db);
  const ids = await resolveTagIds(db, {
    newTagNames: ['alpha', 'bravo', 'charlie'],
    userId: user.id,
  });

  expect(ids).toHaveLength(3);

  const rows = await db
    .select()
    .from(tags)
    .where(and(eq(tags.userId, user.id), notDeleted(tags.deletedAt)));
  expect(rows).toHaveLength(3);
});

test('resolveTagIds — deduplicates on conflict', async ({ db }) => {
  const user = await insertUser(db);

  const ids1 = await resolveTagIds(db, {
    newTagNames: ['travel'],
    userId: user.id,
  });

  const ids2 = await resolveTagIds(db, {
    newTagNames: ['travel'],
    userId: user.id,
  });

  expect(ids1).toEqual(ids2);

  const rows = await db
    .select()
    .from(tags)
    .where(
      and(
        eq(tags.name, 'travel'),
        eq(tags.userId, user.id),
        notDeleted(tags.deletedAt),
      ),
    );
  expect(rows).toHaveLength(1);
});

test('resolveTagIds — combines existing IDs and new names', async ({ db }) => {
  const user = await insertUser(db);
  const existing = await insertTag(db, { name: 'existing', userId: user.id });

  const ids = await resolveTagIds(db, {
    existingTagIds: [existing.id],
    newTagNames: ['new-one'],
    userId: user.id,
  });

  expect(ids).toHaveLength(2);
  expect(ids).toContain(existing.id);
});

test('resolveTagIds — filters empty/whitespace names', async ({ db }) => {
  const user = await insertUser(db);
  const ids = await resolveTagIds(db, {
    newTagNames: ['valid', '', '  '],
    userId: user.id,
  });

  expect(ids).toHaveLength(1);
});
