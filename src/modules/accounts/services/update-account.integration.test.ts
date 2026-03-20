import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { accountTerms } from '@/modules/accounts/db/schema';
import { updateAccountService } from '@/modules/accounts/services/update-account';
import { insertAccountTermsWithAccount } from '~test/factories/account-terms-with-account.factory';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

/**
 * Cast test Db to app Db. Safe because PgTransaction extends PgDatabase
 * at runtime — all query/mutation methods are available.
 */
const asDb = (db: TestDb) => db as unknown as Db;

// ---------------------------------------------------------------------------
// updateAccountService
// ---------------------------------------------------------------------------

test('update — updates account fields', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb, {
    account: { name: 'Old Name' },
  });

  const updated = await updateAccountService(asDb(serviceDb), user.id, {
    id: account.id,
    name: 'New Name',
  });

  expect(updated.name).toBe('New Name');
});

test('update — upserts terms on account without existing terms', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb, {
    account: { type: 'credit_card' },
  });

  await updateAccountService(asDb(serviceDb), user.id, {
    id: account.id,
    terms: { aprBps: 1800 },
  });

  const [terms] = await serviceDb
    .select()
    .from(accountTerms)
    .where(eq(accountTerms.accountId, account.id));

  expect(terms.aprBps).toBe(1800);
});

test('update — updates existing terms', async ({ serviceDb }) => {
  const { account, user } = await insertAccountTermsWithAccount(serviceDb, {
    account: { type: 'credit_card' },
    terms: { aprBps: 1500, dueDay: 10, statementDay: 25 },
  });

  await updateAccountService(asDb(serviceDb), user.id, {
    id: account.id,
    terms: { aprBps: 2400, dueDay: 15 },
  });

  const [terms] = await serviceDb
    .select()
    .from(accountTerms)
    .where(eq(accountTerms.accountId, account.id));

  expect(terms.aprBps).toBe(2400);
  expect(terms.dueDay).toBe(15);
  expect(terms.statementDay).toBe(25);
});

test('update — rejects nonexistent account', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  await expect(
    updateAccountService(asDb(serviceDb), user.id, {
      id: fakeId(),
      name: 'nope',
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — rejects cross-user account', async ({ serviceDb }) => {
  const { account } = await insertAccountWithUser(serviceDb);
  const otherUser = await insertUser(serviceDb);

  await expect(
    updateAccountService(asDb(serviceDb), otherUser.id, {
      id: account.id,
      name: 'Hacked',
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — rejects soft-deleted account', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb, {
    account: { deletedAt: new Date() },
  });

  await expect(
    updateAccountService(asDb(serviceDb), user.id, {
      id: account.id,
      name: 'Ghost',
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — openedAt coercion: string to Date, null clears', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  const withDate = await updateAccountService(asDb(serviceDb), user.id, {
    id: account.id,
    openedAt: '2024-01-15',
  });

  expect(withDate.openedAt).toBeInstanceOf(Date);

  const cleared = await updateAccountService(asDb(serviceDb), user.id, {
    id: account.id,
    openedAt: null,
  });

  expect(cleared.openedAt).toBeNull();
});

test('update — updates currency', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb, {
    account: { currency: 'USD' },
  });

  const updated = await updateAccountService(asDb(serviceDb), user.id, {
    currency: 'EUR',
    id: account.id,
  });

  expect(updated.currency).toBe('EUR');
});

test('update — transitions status active to closed', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb, {
    account: { status: 'active' },
  });

  const closed = await updateAccountService(asDb(serviceDb), user.id, {
    id: account.id,
    status: 'closed',
  });

  expect(closed.status).toBe('closed');

  const reopened = await updateAccountService(asDb(serviceDb), user.id, {
    id: account.id,
    status: 'active',
  });

  expect(reopened.status).toBe('active');
});

test('update — writes audit log with before/after', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  await updateAccountService(asDb(serviceDb), user.id, {
    id: account.id,
    name: 'Updated',
  });

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, account.id),
        eq(auditLogs.tableName, 'ledger_accounts'),
        eq(auditLogs.action, 'update'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].actorId).toBe(user.id);
});
