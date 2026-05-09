import { type } from 'arktype';
import { eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { payees } from '@/modules/payees/db/schema';
import { createPayeeAliasService } from '@/modules/payees/services/create-payee-alias';
import { createPayeeAliasSchema } from '@/modules/payees/validators';
import { payeeAliases } from '@/modules/rules/db/schema';
import { expectPgError } from '~test/assertions';
import type { Db as TestDb } from '~test/factories/base';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

async function insertPayee(db: TestDb, userId: string, name: string) {
  const [payee] = await db
    .insert(payees)
    .values({
      createdById: userId,
      name,
      normalizedName: name.toLowerCase(),
      userId,
    })
    .returning();
  if (!payee) throw new Error('payee insert returned no row');
  return payee;
}

test('createPayeeAlias — inserts alias for owned payee', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const payee = await insertPayee(serviceDb, user.id, 'Acme');

  const alias = await createPayeeAliasService(asDb(serviceDb), user.id, {
    alias: 'ACME *123',
    payeeId: payee.id,
  });

  expect(alias.id).toBeDefined();
  expect(alias.payeeId).toBe(payee.id);
});

test('createPayeeAlias — normalizes alias to trimmed lowercase', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const payee = await insertPayee(serviceDb, user.id, 'Acme');

  const alias = await createPayeeAliasService(asDb(serviceDb), user.id, {
    alias: '  ACME *123  ',
    payeeId: payee.id,
  });

  expect(alias.alias).toBe('acme *123');
});

test('createPayeeAlias — rejects duplicate alias on same payee with friendly 409', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const payee = await insertPayee(serviceDb, user.id, 'Acme');

  await createPayeeAliasService(asDb(serviceDb), user.id, {
    alias: 'acme corp',
    payeeId: payee.id,
  });

  // Second call with mixed-case input must normalize and produce the
  // friendly 409, not fall through to the lowercase CHECK as a 422.
  const err = await createPayeeAliasService(asDb(serviceDb), user.id, {
    alias: 'ACME CORP',
    payeeId: payee.id,
  }).catch((error: unknown) => error);
  expect(err).toBeInstanceOf(Error);
  expect((err as { message: string }).message).toMatch(
    /already has this alias/i,
  );
  expect((err as { status: number }).status).toBe(409);
});

test('createPayeeAlias — allows same alias on different payees', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const payeeA = await insertPayee(serviceDb, user.id, 'Acme A');
  const payeeB = await insertPayee(serviceDb, user.id, 'Acme B');

  await createPayeeAliasService(asDb(serviceDb), user.id, {
    alias: 'shared alias',
    payeeId: payeeA.id,
  });
  await createPayeeAliasService(asDb(serviceDb), user.id, {
    alias: 'shared alias',
    payeeId: payeeB.id,
  });

  const rows = await serviceDb
    .select()
    .from(payeeAliases)
    .where(eq(payeeAliases.alias, 'shared alias'));
  expect(rows).toHaveLength(2);
});

test('createPayeeAlias — rejects payee owned by another user', async ({
  serviceDb,
}) => {
  const owner = await insertUser(serviceDb);
  const stranger = await insertUser(serviceDb);
  const payee = await insertPayee(serviceDb, owner.id, 'Acme');

  await expect(
    createPayeeAliasService(asDb(serviceDb), stranger.id, {
      alias: 'evil',
      payeeId: payee.id,
    }),
  ).rejects.toThrow(/payee not found/i);
});

test('createPayeeAlias — rejects soft-deleted payee', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);
  const payee = await insertPayee(serviceDb, user.id, 'Acme');
  await serviceDb
    .update(payees)
    .set({ deletedAt: new Date() })
    .where(eq(payees.id, payee.id));

  await expect(
    createPayeeAliasService(asDb(serviceDb), user.id, {
      alias: 'tombstone',
      payeeId: payee.id,
    }),
  ).rejects.toThrow(/payee not found/i);
});

test('createPayeeAliasSchema — rejects whitespace-only alias before service runs', () => {
  const result = createPayeeAliasSchema({
    alias: '   ',
    payeeId: '00000000-0000-7000-8000-000000000000',
  });
  expect(result instanceof type.errors).toBe(true);
});

test('createPayeeAliasSchema — accepts 199-char alias with leading/trailing whitespace', () => {
  const padded = `  ${'a'.repeat(199)}  `;
  const result = createPayeeAliasSchema({
    alias: padded,
    payeeId: '00000000-0000-7000-8000-000000000000',
  });
  expect(result instanceof type.errors).toBe(false);
});

test('createPayeeAliasSchema — rejects when trimmed length exceeds 200', () => {
  const result = createPayeeAliasSchema({
    alias: 'a'.repeat(201),
    payeeId: '00000000-0000-7000-8000-000000000000',
  });
  expect(result instanceof type.errors).toBe(true);
});

test('createPayeeAlias — re-create after soft-delete succeeds', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const payee = await insertPayee(serviceDb, user.id, 'Acme');

  const first = await createPayeeAliasService(asDb(serviceDb), user.id, {
    alias: 'acme',
    payeeId: payee.id,
  });

  await serviceDb
    .update(payeeAliases)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(eq(payeeAliases.id, first.id));

  const second = await createPayeeAliasService(asDb(serviceDb), user.id, {
    alias: 'acme',
    payeeId: payee.id,
  });

  expect(second.id).not.toBe(first.id);
  expect(second.alias).toBe('acme');
});

test.for(['AMAZON.COM', 'Amazon.com'])(
  'payeeAliases lowercase CHECK — rejects direct insert of %s',
  async (alias, { db }) => {
    const user = await insertUser(db);
    const payee = await insertPayee(db, user.id, 'Acme');

    await expectPgError(
      () =>
        db
          .insert(payeeAliases)
          .values({ alias, createdById: user.id, payeeId: payee.id }),
      { code: '23514', constraint: 'payee_aliases_alias_lowercase_check' },
    );
  },
);

test.for(['  acme', 'acme  ', ' acme '])(
  'payeeAliases trimmed CHECK — rejects direct insert of "%s"',
  async (alias, { db }) => {
    const user = await insertUser(db);
    const payee = await insertPayee(db, user.id, 'Acme');

    await expectPgError(
      () =>
        db
          .insert(payeeAliases)
          .values({ alias, createdById: user.id, payeeId: payee.id }),
      { code: '23514', constraint: 'payee_aliases_alias_trimmed_check' },
    );
  },
);
