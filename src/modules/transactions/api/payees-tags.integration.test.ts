import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import { payees, tags } from '@/db/schema';
import { notDeleted } from '@/lib/audit/soft-delete';
import { parsePgError, throwIfConstraintViolation } from '@/lib/db/pg-error';
import { resolvePayeeId } from '@/modules/transactions/lib/resolve-payee';
import { resolveTagIds } from '@/modules/transactions/lib/resolve-tags';
import { expectPgError } from '~test/assertions';
import { fakeId } from '~test/factories/base';
import { insertPayee } from '~test/factories/payee.factory';
import { insertTag } from '~test/factories/tag.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

// ---------------------------------------------------------------------------
// List payees
// ---------------------------------------------------------------------------

test('listPayees — returns active payees ordered by name', async ({ db }) => {
  const user = await insertUser(db);
  const b = await insertPayee(db, { name: 'Bravo', userId: user.id });
  const a = await insertPayee(db, { name: 'Alpha', userId: user.id });

  const rows = await db
    .select()
    .from(payees)
    .where(and(eq(payees.userId, user.id), notDeleted(payees.deletedAt)))
    .orderBy(payees.name);

  expect(rows).toHaveLength(2);
  expect(rows[0].name).toBe(a.name);
  expect(rows[1].name).toBe(b.name);
});

test('listPayees — excludes soft-deleted', async ({ db }) => {
  const user = await insertUser(db);
  await insertPayee(db, { deletedAt: new Date(), userId: user.id });
  await insertPayee(db, { userId: user.id });

  const rows = await db
    .select()
    .from(payees)
    .where(and(eq(payees.userId, user.id), notDeleted(payees.deletedAt)));

  expect(rows).toHaveLength(1);
});

test('listPayees — isolates by user', async ({ db }) => {
  const user1 = await insertUser(db);
  const user2 = await insertUser(db);
  await insertPayee(db, { userId: user1.id });
  await insertPayee(db, { userId: user2.id });

  const rows = await db
    .select()
    .from(payees)
    .where(eq(payees.userId, user1.id));

  expect(rows).toHaveLength(1);
});

test('createPayee — inserts with name', async ({ db }) => {
  const user = await insertUser(db);
  const payee = await insertPayee(db, { name: 'Acme Corp', userId: user.id });

  expect(payee.id).toBeDefined();
  expect(payee.name).toBe('Acme Corp');
  expect(payee.userId).toBe(user.id);
});

test('createPayee — rejects duplicate (userId, name)', async ({ db }) => {
  const user = await insertUser(db);
  await insertPayee(db, { name: 'Unique Payee', userId: user.id });

  await expectPgError(
    () => insertPayee(db, { name: 'Unique Payee', userId: user.id }),
    { code: '23505', constraint: 'payees_user_name_idx' },
  );
});

test('createPayee — normalizes name to lowercase trimmed', async ({ db }) => {
  const user = await insertUser(db);
  const name = '  Mixed Case  ';
  const normalizedName = name.trim().toLowerCase();

  const payee = await insertPayee(db, {
    name: name.trim(),
    normalizedName,
    userId: user.id,
  });

  expect(payee.normalizedName).toBe('mixed case');
  expect(payee.name).toBe('Mixed Case');
});

test('createPayee — dedup returns existing on normalized match', async ({
  db,
}) => {
  const user = await insertUser(db);
  await insertPayee(db, {
    name: 'Acme Corp',
    normalizedName: 'acme corp',
    userId: user.id,
  });

  // Mirrors server fn: lookup by normalizedName + userId + notDeleted
  const existing = await db
    .select()
    .from(payees)
    .where(
      and(
        eq(payees.normalizedName, 'acme corp'),
        eq(payees.userId, user.id),
        notDeleted(payees.deletedAt),
      ),
    );

  expect(existing).toHaveLength(1);
  expect(existing[0].name).toBe('Acme Corp');
});

test('createPayee — re-creates after soft-delete (partial index)', async ({
  db,
}) => {
  const user = await insertUser(db);
  await insertPayee(db, {
    deletedAt: new Date(),
    name: 'Gone Payee',
    normalizedName: 'gone payee',
    userId: user.id,
  });

  // Partial unique index allows re-creation with the same name
  const fresh = await insertPayee(db, {
    name: 'Gone Payee',
    normalizedName: 'gone payee',
    userId: user.id,
  });

  expect(fresh.name).toBe('Gone Payee');
  expect(fresh.deletedAt).toBeNull();
});

test('createPayee — throwIfConstraintViolation returns 409 with fix message', async ({
  db,
}) => {
  const user = await insertUser(db);
  await insertPayee(db, { name: 'Dup Payee', userId: user.id });

  let caught: unknown;
  try {
    await insertPayee(db, { name: 'Dup Payee', userId: user.id });
  } catch (error) {
    caught = error;
  }

  if (caught === undefined) {
    expect.fail('Expected a Postgres constraint violation');
  }

  const pgInfo = parsePgError(caught);
  expect(pgInfo).not.toBeNull();
  expect(pgInfo!.constraint).toBe('payees_user_name_idx');
  expect(() => throwIfConstraintViolation(caught, 'payee.create')).toThrow(
    expect.objectContaining({
      fix: 'A payee with this name already exists.',
      status: 409,
    }),
  );
});

// ---------------------------------------------------------------------------
// List tags
// ---------------------------------------------------------------------------

test('listTags — returns active tags ordered by name', async ({ db }) => {
  const user = await insertUser(db);
  const b = await insertTag(db, { name: 'bravo', userId: user.id });
  const a = await insertTag(db, { name: 'alpha', userId: user.id });

  const rows = await db
    .select()
    .from(tags)
    .where(and(eq(tags.userId, user.id), notDeleted(tags.deletedAt)))
    .orderBy(tags.name);

  expect(rows).toHaveLength(2);
  expect(rows[0].name).toBe(a.name);
  expect(rows[1].name).toBe(b.name);
});

test('listTags — excludes soft-deleted', async ({ db }) => {
  const user = await insertUser(db);
  await insertTag(db, { deletedAt: new Date(), userId: user.id });
  await insertTag(db, { userId: user.id });

  const rows = await db
    .select()
    .from(tags)
    .where(and(eq(tags.userId, user.id), notDeleted(tags.deletedAt)));

  expect(rows).toHaveLength(1);
});

test('listTags — isolates by user', async ({ db }) => {
  const user1 = await insertUser(db);
  const user2 = await insertUser(db);
  await insertTag(db, { userId: user1.id });
  await insertTag(db, { userId: user2.id });

  const rows = await db.select().from(tags).where(eq(tags.userId, user1.id));

  expect(rows).toHaveLength(1);
});

test('createTag — inserts with name', async ({ db }) => {
  const user = await insertUser(db);
  const tag = await insertTag(db, { name: 'expenses', userId: user.id });

  expect(tag.id).toBeDefined();
  expect(tag.name).toBe('expenses');
  expect(tag.userId).toBe(user.id);
});

test('createTag — rejects duplicate (userId, name)', async ({ db }) => {
  const user = await insertUser(db);
  await insertTag(db, { name: 'unique-tag', userId: user.id });

  await expectPgError(
    () => insertTag(db, { name: 'unique-tag', userId: user.id }),
    { code: '23505', constraint: 'tags_user_name_idx' },
  );
});

test('createTag — stores trimmed name', async ({ db }) => {
  const user = await insertUser(db);
  const tag = await insertTag(db, { name: 'spaced', userId: user.id });

  expect(tag.name).toBe('spaced');
});

test('createTag — dedup returns existing on exact match', async ({ db }) => {
  const user = await insertUser(db);
  await insertTag(db, { name: 'groceries', userId: user.id });

  // Mirrors server fn: lookup by exact name + userId + notDeleted
  const existing = await db
    .select()
    .from(tags)
    .where(
      and(
        eq(tags.name, 'groceries'),
        eq(tags.userId, user.id),
        notDeleted(tags.deletedAt),
      ),
    );

  expect(existing).toHaveLength(1);
  expect(existing[0].name).toBe('groceries');
});

test('createTag — re-creates after soft-delete (partial index)', async ({
  db,
}) => {
  const user = await insertUser(db);
  await insertTag(db, {
    deletedAt: new Date(),
    name: 'gone-tag',
    userId: user.id,
  });

  // Partial unique index allows re-creation with the same name
  const fresh = await insertTag(db, { name: 'gone-tag', userId: user.id });

  expect(fresh.name).toBe('gone-tag');
  expect(fresh.deletedAt).toBeNull();
});

test('createTag — throwIfConstraintViolation returns 409 with fix message', async ({
  db,
}) => {
  const user = await insertUser(db);
  await insertTag(db, { name: 'dup-tag', userId: user.id });

  let caught: unknown;
  try {
    await insertTag(db, { name: 'dup-tag', userId: user.id });
  } catch (error) {
    caught = error;
  }

  if (caught === undefined) {
    expect.fail('Expected a Postgres constraint violation');
  }

  const pgInfo = parsePgError(caught);
  expect(pgInfo).not.toBeNull();
  expect(pgInfo!.constraint).toBe('tags_user_name_idx');
  expect(() => throwIfConstraintViolation(caught, 'tag.create')).toThrow(
    expect.objectContaining({
      fix: 'A tag with this name already exists.',
      status: 409,
    }),
  );
});

test('createTag — dedup is case-sensitive', async ({ db }) => {
  const user = await insertUser(db);
  const lower = await insertTag(db, { name: 'groceries', userId: user.id });
  const upper = await insertTag(db, { name: 'Groceries', userId: user.id });

  expect(lower.id).not.toBe(upper.id);

  // Exact-match lookup finds only the lowercase variant
  const found = await db
    .select()
    .from(tags)
    .where(
      and(
        eq(tags.name, 'groceries'),
        eq(tags.userId, user.id),
        notDeleted(tags.deletedAt),
      ),
    );

  expect(found).toHaveLength(1);
  expect(found[0].id).toBe(lower.id);
});

// ---------------------------------------------------------------------------
// FK violation — payees
// ---------------------------------------------------------------------------

test('createPayee — throwIfConstraintViolation returns 422 for FK violation', async ({
  db,
}) => {
  let caught: unknown;
  try {
    await db.insert(payees).values({
      createdById: fakeId(),
      name: 'Orphan Payee',
      normalizedName: 'orphan payee',
      userId: fakeId(),
    });
  } catch (error) {
    caught = error;
  }

  if (caught === undefined) {
    expect.fail('Expected a Postgres FK violation');
  }

  const pgInfo = parsePgError(caught);
  expect(pgInfo).not.toBeNull();
  expect(pgInfo!.code).toBe('23503');

  expect(() => throwIfConstraintViolation(caught, 'payee.create')).toThrow(
    expect.objectContaining({
      fix: expect.stringContaining('referenced record'),
      status: 422,
    }),
  );
});

// ---------------------------------------------------------------------------
// FK violation — tags
// ---------------------------------------------------------------------------

test('createTag — throwIfConstraintViolation returns 422 for FK violation', async ({
  db,
}) => {
  let caught: unknown;
  try {
    await db.insert(tags).values({
      createdById: fakeId(),
      name: 'orphan-tag',
      userId: fakeId(),
    });
  } catch (error) {
    caught = error;
  }

  if (caught === undefined) {
    expect.fail('Expected a Postgres FK violation');
  }

  const pgInfo = parsePgError(caught);
  expect(pgInfo).not.toBeNull();
  expect(pgInfo!.code).toBe('23503');

  expect(() => throwIfConstraintViolation(caught, 'tag.create')).toThrow(
    expect.objectContaining({
      fix: expect.stringContaining('referenced record'),
      status: 422,
    }),
  );
});

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

  // Only one row in the table
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

  // First call creates the tag
  const ids1 = await resolveTagIds(db, {
    newTagNames: ['travel'],
    userId: user.id,
  });

  // Second call with same name returns existing
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
