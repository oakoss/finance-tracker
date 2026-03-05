import { expect } from 'vitest';

import { payees, tags } from '@/db/schema';
import { parsePgError, throwIfConstraintViolation } from '@/lib/db/pg-error';
import { expectPgError } from '~test/assertions';
import { fakeId } from '~test/factories/base';
import { insertPayee } from '~test/factories/payee.factory';
import { insertTag } from '~test/factories/tag.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

// ---------------------------------------------------------------------------
// DB-constraint and schema-level tests — payees
// ---------------------------------------------------------------------------

test('createPayee — rejects duplicate (userId, name)', async ({ db }) => {
  const user = await insertUser(db);
  await insertPayee(db, { name: 'Unique Payee', userId: user.id });

  await expectPgError(
    () => insertPayee(db, { name: 'Unique Payee', userId: user.id }),
    { code: '23505', constraint: 'payees_user_name_idx' },
  );
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
// DB-constraint and schema-level tests — tags
// ---------------------------------------------------------------------------

test('createTag — rejects duplicate (userId, name)', async ({ db }) => {
  const user = await insertUser(db);
  await insertTag(db, { name: 'unique-tag', userId: user.id });

  await expectPgError(
    () => insertTag(db, { name: 'unique-tag', userId: user.id }),
    { code: '23505', constraint: 'tags_user_name_idx' },
  );
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
