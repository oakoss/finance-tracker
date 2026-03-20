import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { notDeleted } from '@/lib/audit/soft-delete';
import { accountTerms, ledgerAccounts } from '@/modules/accounts/db/schema';
import { deleteAccountService } from '@/modules/accounts/services/delete-account';
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
// deleteAccountService
// ---------------------------------------------------------------------------

test('delete — soft-deletes account', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  await deleteAccountService(asDb(serviceDb), user.id, { id: account.id });

  const rows = await serviceDb
    .select()
    .from(ledgerAccounts)
    .where(
      and(
        eq(ledgerAccounts.id, account.id),
        notDeleted(ledgerAccounts.deletedAt),
      ),
    );

  expect(rows).toHaveLength(0);
});

test('delete — cascade soft-deletes account terms', async ({ serviceDb }) => {
  const { account, user } = await insertAccountTermsWithAccount(serviceDb, {
    account: { type: 'credit_card' },
  });

  await deleteAccountService(asDb(serviceDb), user.id, { id: account.id });

  const [terms] = await serviceDb
    .select()
    .from(accountTerms)
    .where(eq(accountTerms.accountId, account.id));

  expect(terms.deletedAt).toBeInstanceOf(Date);
});

test('delete — rejects cross-user account', async ({ serviceDb }) => {
  const { account } = await insertAccountWithUser(serviceDb);
  const otherUser = await insertUser(serviceDb);

  await expect(
    deleteAccountService(asDb(serviceDb), otherUser.id, { id: account.id }),
  ).rejects.toMatchObject({ status: 404 });
});

test('delete — rejects nonexistent account', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  await expect(
    deleteAccountService(asDb(serviceDb), user.id, { id: fakeId() }),
  ).rejects.toMatchObject({ status: 404 });
});

test('delete — rejects already-soft-deleted account', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb, {
    account: { deletedAt: new Date() },
  });

  await expect(
    deleteAccountService(asDb(serviceDb), user.id, { id: account.id }),
  ).rejects.toMatchObject({ status: 404 });
});

test('delete — writes audit log entry', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  await deleteAccountService(asDb(serviceDb), user.id, { id: account.id });

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, account.id),
        eq(auditLogs.tableName, 'ledger_accounts'),
        eq(auditLogs.action, 'delete'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].actorId).toBe(user.id);
});
