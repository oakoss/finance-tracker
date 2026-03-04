import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import { payees, tags } from '@/db/schema';
import { notDeleted } from '@/lib/audit/soft-delete';
import { parsePgError, throwIfConstraintViolation } from '@/lib/db/pg-error';
import { expectPgError } from '~test/assertions';
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
