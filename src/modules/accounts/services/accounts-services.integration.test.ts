import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { notDeleted } from '@/lib/audit/soft-delete';
import {
  accountBalanceSnapshots,
  accountTerms,
  ledgerAccounts,
} from '@/modules/accounts/db/schema';
import { createAccountService } from '@/modules/accounts/services/create-account';
import { deleteAccountService } from '@/modules/accounts/services/delete-account';
import { listAccountsService } from '@/modules/accounts/services/list-accounts';
import { updateAccountService } from '@/modules/accounts/services/update-account';
import { insertAccountBalanceSnapshot } from '~test/factories/account-balance-snapshot.factory';
import { insertAccountTermsWithAccount } from '~test/factories/account-terms-with-account.factory';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

/**
 * Cast test Db to app Db. Safe because PgTransaction extends PgDatabase
 * at runtime — all query/mutation methods are available.
 */
const asDb = (db: TestDb) => db as unknown as Db;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validCreateInput(overrides?: Record<string, unknown>) {
  return {
    currency: 'USD',
    name: 'Test Account',
    type: 'checking' as const,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createAccountService
// ---------------------------------------------------------------------------

test('create — inserts account with required fields and defaults', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  const result = await createAccountService(
    asDb(serviceDb),
    user.id,
    validCreateInput(),
  );

  expect(result.id).toBeDefined();
  expect(result.name).toBe('Test Account');
  expect(result.currency).toBe('USD');
  expect(result.type).toBe('checking');
  expect(result.status).toBe('active');
  expect(result.userId).toBe(user.id);
});

test('create — inserts terms for credit card', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const result = await createAccountService(
    asDb(serviceDb),
    user.id,
    validCreateInput({
      terms: { aprBps: 2499, dueDay: 15, statementDay: 20 },
      type: 'credit_card',
    }),
  );

  const [terms] = await serviceDb
    .select()
    .from(accountTerms)
    .where(eq(accountTerms.accountId, result.id));

  expect(terms.aprBps).toBe(2499);
  expect(terms.dueDay).toBe(15);
  expect(terms.statementDay).toBe(20);
});

test('create — inserts initial balance snapshot', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const result = await createAccountService(
    asDb(serviceDb),
    user.id,
    validCreateInput({ initialBalanceCents: 50_000 }),
  );

  const [snapshot] = await serviceDb
    .select()
    .from(accountBalanceSnapshots)
    .where(eq(accountBalanceSnapshots.accountId, result.id));

  expect(snapshot.balanceCents).toBe(50_000);
  expect(snapshot.source).toBe('manual');
});

test('create — coerces openedAt string to Date', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const result = await createAccountService(
    asDb(serviceDb),
    user.id,
    validCreateInput({ openedAt: '2024-03-15' }),
  );

  expect(result.openedAt).toBeInstanceOf(Date);
});

test('create — writes audit log entry', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const result = await createAccountService(
    asDb(serviceDb),
    user.id,
    validCreateInput(),
  );

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, result.id),
        eq(auditLogs.tableName, 'ledger_accounts'),
        eq(auditLogs.action, 'create'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].actorId).toBe(user.id);
});

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

// ---------------------------------------------------------------------------
// listAccountsService
// ---------------------------------------------------------------------------

test('list — returns user accounts with terms and balance', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountTermsWithAccount(serviceDb, {
    account: { type: 'credit_card' },
    terms: { aprBps: 1999 },
  });

  await serviceDb
    .insert(accountBalanceSnapshots)
    .values({
      accountId: account.id,
      balanceCents: 50_000,
      createdById: user.id,
      recordedAt: new Date(),
      source: 'manual',
    });

  const rows = await listAccountsService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(1);
  expect(rows[0].account.id).toBe(account.id);
  expect(rows[0].terms?.aprBps).toBe(1999);
  expect(rows[0].latestBalanceCents).toBe(50_000);
});

test('list — excludes other user accounts', async ({ serviceDb }) => {
  await insertAccountWithUser(serviceDb);
  const otherUser = await insertUser(serviceDb);

  const rows = await listAccountsService(asDb(serviceDb), otherUser.id);

  expect(rows).toHaveLength(0);
});

test('list — returns latestBalanceCents from most recent snapshot', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  await insertAccountBalanceSnapshot(serviceDb, {
    accountId: account.id,
    balanceCents: 10_000,
    recordedAt: new Date('2024-01-01'),
  });
  await insertAccountBalanceSnapshot(serviceDb, {
    accountId: account.id,
    balanceCents: 50_000,
    recordedAt: new Date('2024-06-01'),
  });

  const rows = await listAccountsService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(1);
  expect(rows[0].latestBalanceCents).toBe(50_000);
});

test('list — returns null latestBalanceCents when no snapshots', async ({
  serviceDb,
}) => {
  const { user } = await insertAccountWithUser(serviceDb);

  const rows = await listAccountsService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(1);
  expect(rows[0].latestBalanceCents).toBeNull();
});

test('list — ordered by createdAt DESC', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const first = await insertLedgerAccount(serviceDb, {
    createdAt: new Date('2024-01-01'),
    name: 'First',
    userId: user.id,
  });
  const second = await insertLedgerAccount(serviceDb, {
    createdAt: new Date('2024-06-01'),
    name: 'Second',
    userId: user.id,
  });

  const rows = await listAccountsService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(2);
  expect(rows[0].account.id).toBe(second.id);
  expect(rows[1].account.id).toBe(first.id);
});

test('list — includes account but returns soft-deleted terms', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountTermsWithAccount(serviceDb, {
    account: { type: 'credit_card' },
    terms: { aprBps: 1999 },
  });

  await serviceDb
    .update(accountTerms)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(eq(accountTerms.accountId, account.id));

  const rows = await listAccountsService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(1);
  expect(rows[0].terms?.deletedAt).toBeInstanceOf(Date);
});

test('list — excludes soft-deleted accounts', async ({ serviceDb }) => {
  const { user } = await insertAccountWithUser(serviceDb, {
    account: { deletedAt: new Date() },
  });

  const rows = await listAccountsService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(0);
});
