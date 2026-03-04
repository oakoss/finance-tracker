import { and, eq, isNull } from 'drizzle-orm';
import { expect } from 'vitest';

import { payees, tags } from '@/db/schema';
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
    .where(eq(payees.userId, user.id))
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
    .where(and(eq(payees.userId, user.id), isNull(payees.deletedAt)));

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
    .where(eq(tags.userId, user.id))
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
    .where(and(eq(tags.userId, user.id), isNull(tags.deletedAt)));

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
