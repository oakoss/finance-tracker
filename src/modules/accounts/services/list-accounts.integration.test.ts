import { eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import {
  accountBalanceSnapshots,
  accountTerms,
} from '@/modules/accounts/db/schema';
import { listAccountsService } from '@/modules/accounts/services/list-accounts';
import { insertAccountBalanceSnapshot } from '~test/factories/account-balance-snapshot.factory';
import { insertAccountTermsWithAccount } from '~test/factories/account-terms-with-account.factory';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import type { Db as TestDb } from '~test/factories/base';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

/**
 * Cast test Db to app Db. Safe because PgTransaction extends PgDatabase
 * at runtime — all query/mutation methods are available.
 */
const asDb = (db: TestDb) => db as unknown as Db;

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
