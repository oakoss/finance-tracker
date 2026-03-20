import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { notDeleted } from '@/lib/audit/soft-delete';
import { payees } from '@/modules/transactions/db/schema';
import { createPayeeService } from '@/modules/transactions/services/create-payee';
import type { Db as TestDb } from '~test/factories/base';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

/**
 * Cast test Db to app Db. Safe because PgTransaction extends PgDatabase
 * at runtime — all query/mutation methods are available.
 */
const asDb = (db: TestDb) => db as unknown as Db;

// ---------------------------------------------------------------------------
// createPayeeService
// ---------------------------------------------------------------------------

test('createPayee — inserts with name', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const payee = await createPayeeService(asDb(serviceDb), user.id, {
    name: 'Acme Corp',
  });

  expect(payee.id).toBeDefined();
  expect(payee.name).toBe('Acme Corp');
  expect(payee.userId).toBe(user.id);
});

test('createPayee — normalizes name to lowercase trimmed', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  const payee = await createPayeeService(asDb(serviceDb), user.id, {
    name: '  Mixed Case  ',
  });

  expect(payee.normalizedName).toBe('mixed case');
  expect(payee.name).toBe('Mixed Case');
});

test('createPayee — dedup returns existing on normalized match', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  const first = await createPayeeService(asDb(serviceDb), user.id, {
    name: 'Acme Corp',
  });
  const second = await createPayeeService(asDb(serviceDb), user.id, {
    name: 'Acme Corp',
  });

  expect(first.id).toBe(second.id);

  const rows = await serviceDb
    .select()
    .from(payees)
    .where(
      and(
        eq(payees.normalizedName, 'acme corp'),
        eq(payees.userId, user.id),
        notDeleted(payees.deletedAt),
      ),
    );
  expect(rows).toHaveLength(1);
});
