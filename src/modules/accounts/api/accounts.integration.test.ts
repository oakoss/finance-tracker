import { and, desc, eq, getTableName } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '~test/factories/base';

import {
  accountBalanceSnapshots,
  accountTerms,
  creditCardCatalog,
  ledgerAccounts,
} from '@/db/schema';
import { notDeleted } from '@/lib/audit/soft-delete';
import { expectAuditLogEntry, expectPgError } from '~test/assertions';
import { insertAccountBalanceSnapshot } from '~test/factories/account-balance-snapshot.factory';
import { insertAccountTerms } from '~test/factories/account-terms.factory';
import { insertCreditCardCatalog } from '~test/factories/credit-card-catalog.factory';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

function latestBalanceSubquery(db: Db) {
  return db
    .selectDistinctOn([accountBalanceSnapshots.accountId], {
      accountId: accountBalanceSnapshots.accountId,
      balanceCents: accountBalanceSnapshots.balanceCents,
    })
    .from(accountBalanceSnapshots)
    .orderBy(
      accountBalanceSnapshots.accountId,
      desc(accountBalanceSnapshots.recordedAt),
    )
    .as('latest_balance');
}

// ---------------------------------------------------------------------------
// List accounts
// ---------------------------------------------------------------------------

test('list — returns active accounts for user with terms and latest balance', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, {
    type: 'credit_card',
    userId: user.id,
  });
  await insertAccountTerms(db, { accountId: account.id, aprBps: 1999 });
  await insertAccountBalanceSnapshot(db, {
    accountId: account.id,
    balanceCents: 50_000,
  });

  const rows = await db
    .select({
      account: ledgerAccounts,
      terms: accountTerms,
    })
    .from(ledgerAccounts)
    .leftJoin(accountTerms, eq(accountTerms.accountId, ledgerAccounts.id))
    .where(
      and(
        eq(ledgerAccounts.userId, user.id),
        notDeleted(ledgerAccounts.deletedAt),
      ),
    );

  expect(rows).toHaveLength(1);
  expect(rows[0].account.name).toBe(account.name);
  expect(rows[0].terms?.aprBps).toBe(1999);
});

test('list — excludes soft-deleted accounts', async ({ db }) => {
  const user = await insertUser(db);
  await insertLedgerAccount(db, {
    deletedAt: new Date(),
    userId: user.id,
  });
  await insertLedgerAccount(db, { userId: user.id });

  const rows = await db
    .select()
    .from(ledgerAccounts)
    .where(
      and(
        eq(ledgerAccounts.userId, user.id),
        notDeleted(ledgerAccounts.deletedAt),
      ),
    );

  expect(rows).toHaveLength(1);
});

test('list — does not return other users accounts', async ({ db }) => {
  const user1 = await insertUser(db);
  const user2 = await insertUser(db);
  await insertLedgerAccount(db, { userId: user1.id });
  await insertLedgerAccount(db, { userId: user2.id });

  const rows = await db
    .select()
    .from(ledgerAccounts)
    .where(
      and(
        eq(ledgerAccounts.userId, user1.id),
        notDeleted(ledgerAccounts.deletedAt),
      ),
    );

  expect(rows).toHaveLength(1);
  expect(rows[0].userId).toBe(user1.id);
});

test('list — returns latestBalanceCents from most recent snapshot', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });

  await Promise.all([
    insertAccountBalanceSnapshot(db, {
      accountId: account.id,
      balanceCents: 10_000,
      recordedAt: new Date('2024-01-01'),
    }),
    insertAccountBalanceSnapshot(db, {
      accountId: account.id,
      balanceCents: 50_000,
      recordedAt: new Date('2024-06-01'),
    }),
  ]);

  const latestBalance = latestBalanceSubquery(db);

  const rows = await db
    .select({
      account: ledgerAccounts,
      latestBalanceCents: latestBalance.balanceCents,
    })
    .from(ledgerAccounts)
    .leftJoin(latestBalance, eq(latestBalance.accountId, ledgerAccounts.id))
    .where(
      and(
        eq(ledgerAccounts.id, account.id),
        notDeleted(ledgerAccounts.deletedAt),
      ),
    );

  expect(rows).toHaveLength(1);
  expect(rows[0].latestBalanceCents).toBe(50_000);
});

test('list — returns null latestBalanceCents when no snapshots', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });

  const latestBalance = latestBalanceSubquery(db);

  const rows = await db
    .select({
      account: ledgerAccounts,
      latestBalanceCents: latestBalance.balanceCents,
    })
    .from(ledgerAccounts)
    .leftJoin(latestBalance, eq(latestBalance.accountId, ledgerAccounts.id))
    .where(
      and(
        eq(ledgerAccounts.id, account.id),
        notDeleted(ledgerAccounts.deletedAt),
      ),
    );

  expect(rows).toHaveLength(1);
  expect(rows[0].latestBalanceCents).toBeNull();
});

test('list — ordered by createdAt DESC', async ({ db }) => {
  const user = await insertUser(db);
  const older = new Date('2024-01-01');
  const newer = new Date('2024-06-01');

  const first = await insertLedgerAccount(db, {
    createdAt: older,
    name: 'First',
    userId: user.id,
  });
  const second = await insertLedgerAccount(db, {
    createdAt: newer,
    name: 'Second',
    userId: user.id,
  });

  const rows = await db
    .select()
    .from(ledgerAccounts)
    .where(
      and(
        eq(ledgerAccounts.userId, user.id),
        notDeleted(ledgerAccounts.deletedAt),
      ),
    )
    .orderBy(desc(ledgerAccounts.createdAt));

  expect(rows).toHaveLength(2);
  expect(rows[0].id).toBe(second.id);
  expect(rows[1].id).toBe(first.id);
});

// ---------------------------------------------------------------------------
// Create account
// ---------------------------------------------------------------------------

test('create — inserts account with required fields', async ({ db }) => {
  const user = await insertUser(db);

  const [account] = await db
    .insert(ledgerAccounts)
    .values({
      createdById: user.id,
      currency: 'USD',
      name: 'My Checking',
      type: 'checking',
      userId: user.id,
    })
    .returning();

  expect(account.id).toBeDefined();
  expect(account.name).toBe('My Checking');
  expect(account.currency).toBe('USD');
  expect(account.type).toBe('checking');
  expect(account.status).toBe('active');
});

test('create — inserts account with terms for credit card', async ({ db }) => {
  const user = await insertUser(db);

  const [account] = await db
    .insert(ledgerAccounts)
    .values({
      createdById: user.id,
      currency: 'USD',
      name: 'My Credit Card',
      type: 'credit_card',
      userId: user.id,
    })
    .returning();

  const [terms] = await db
    .insert(accountTerms)
    .values({
      accountId: account.id,
      aprBps: 2499,
      createdById: user.id,
      dueDay: 15,
      statementDay: 20,
    })
    .returning();

  expect(terms.accountId).toBe(account.id);
  expect(terms.aprBps).toBe(2499);
  expect(terms.dueDay).toBe(15);
});

test('create — inserts initial balance snapshot', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });

  const [snapshot] = await db
    .insert(accountBalanceSnapshots)
    .values({
      accountId: account.id,
      balanceCents: 100_000,
      createdById: user.id,
      recordedAt: new Date(),
      source: 'manual',
    })
    .returning();

  expect(snapshot.accountId).toBe(account.id);
  expect(snapshot.balanceCents).toBe(100_000);
  expect(snapshot.source).toBe('manual');
});

test('create — writes audit log', async ({ db }) => {
  const user = await insertUser(db);

  const [account] = await db
    .insert(ledgerAccounts)
    .values({
      createdById: user.id,
      currency: 'USD',
      name: 'Audit Test',
      type: 'savings',
      userId: user.id,
    })
    .returning();

  await expectAuditLogEntry(db, {
    action: 'create',
    actorId: user.id,
    afterData: account as unknown as Record<string, unknown>,
    recordId: account.id,
    tableName: getTableName(ledgerAccounts),
  });
});

test('create — rejects duplicate accountTerms for same account', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, {
    type: 'credit_card',
    userId: user.id,
  });

  await insertAccountTerms(db, { accountId: account.id });

  await expectPgError(
    () =>
      db.insert(accountTerms).values({
        accountId: account.id,
        aprBps: 1500,
        createdById: user.id,
        dueDay: 1,
        statementDay: 15,
      }),
    { code: '23505', constraint: 'account_terms_account_id_idx' },
  );
});

// ---------------------------------------------------------------------------
// Update account
// ---------------------------------------------------------------------------

test('update — updates account fields', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, {
    name: 'Old Name',
    userId: user.id,
  });

  const [updated] = await db
    .update(ledgerAccounts)
    .set({ name: 'New Name', updatedById: user.id })
    .where(
      and(
        eq(ledgerAccounts.id, account.id),
        eq(ledgerAccounts.userId, user.id),
      ),
    )
    .returning();

  expect(updated.name).toBe('New Name');
});

test('update — upserts terms on account without existing terms', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, {
    type: 'credit_card',
    userId: user.id,
  });

  const [terms] = await db
    .insert(accountTerms)
    .values({
      accountId: account.id,
      aprBps: 1800,
      createdById: user.id,
    })
    .returning();

  expect(terms.aprBps).toBe(1800);

  await db
    .update(accountTerms)
    .set({ aprBps: 2200 })
    .where(eq(accountTerms.accountId, account.id));

  const [updatedTerms] = await db
    .select()
    .from(accountTerms)
    .where(eq(accountTerms.accountId, account.id));

  expect(updatedTerms.aprBps).toBe(2200);
});

test('update — updates existing terms (update branch)', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, {
    type: 'credit_card',
    userId: user.id,
  });

  await insertAccountTerms(db, {
    accountId: account.id,
    aprBps: 1500,
    dueDay: 10,
    statementDay: 25,
  });

  await db
    .update(accountTerms)
    .set({ aprBps: 2400, dueDay: 15, updatedById: user.id })
    .where(eq(accountTerms.accountId, account.id));

  const [terms] = await db
    .select()
    .from(accountTerms)
    .where(eq(accountTerms.accountId, account.id));

  expect(terms.aprBps).toBe(2400);
  expect(terms.dueDay).toBe(15);
  expect(terms.statementDay).toBe(25); // unchanged
  expect(terms.updatedById).toBe(user.id);
});

test('update — rejects non-owner', async ({ db }) => {
  const owner = await insertUser(db);
  const other = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: owner.id });

  const result = await db
    .update(ledgerAccounts)
    .set({ name: 'Hacked' })
    .where(
      and(
        eq(ledgerAccounts.id, account.id),
        eq(ledgerAccounts.userId, other.id),
      ),
    )
    .returning();

  expect(result).toHaveLength(0);
});

test('update — soft-deleted account returns zero rows', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, {
    deletedAt: new Date(),
    userId: user.id,
  });

  const result = await db
    .update(ledgerAccounts)
    .set({ name: 'Ghost', updatedById: user.id })
    .where(
      and(
        eq(ledgerAccounts.id, account.id),
        eq(ledgerAccounts.userId, user.id),
        notDeleted(ledgerAccounts.deletedAt),
      ),
    )
    .returning();

  expect(result).toHaveLength(0);
});

test('update — openedAt coercion: string → Date, falsy → null', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });

  // Date field accepts a Date instance
  const [withDate] = await db
    .update(ledgerAccounts)
    .set({
      openedAt: new Date('2024-01-15'),
      updatedById: user.id,
    })
    .where(eq(ledgerAccounts.id, account.id))
    .returning();

  expect(withDate.openedAt).toBeInstanceOf(Date);

  // Falsy → null
  const [cleared] = await db
    .update(ledgerAccounts)
    .set({ openedAt: null, updatedById: user.id })
    .where(eq(ledgerAccounts.id, account.id))
    .returning();

  expect(cleared.openedAt).toBeNull();
});

// ---------------------------------------------------------------------------
// Delete account (soft delete)
// ---------------------------------------------------------------------------

test('delete — soft deletes account', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });

  await db
    .update(ledgerAccounts)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(
      and(
        eq(ledgerAccounts.id, account.id),
        eq(ledgerAccounts.userId, user.id),
      ),
    );

  const [deleted] = await db
    .select()
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.id, account.id));

  expect(deleted.deletedAt).toBeInstanceOf(Date);
  expect(deleted.deletedById).toBe(user.id);
});

test('delete — rejects non-owner', async ({ db }) => {
  const owner = await insertUser(db);
  const other = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: owner.id });

  const result = await db
    .update(ledgerAccounts)
    .set({ deletedAt: new Date(), deletedById: other.id })
    .where(
      and(
        eq(ledgerAccounts.id, account.id),
        eq(ledgerAccounts.userId, other.id),
      ),
    )
    .returning();

  expect(result).toHaveLength(0);

  const [unchanged] = await db
    .select()
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.id, account.id));

  expect(unchanged.deletedAt).toBeNull();
});

test('delete — cascade soft-deletes accountTerms', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, {
    type: 'credit_card',
    userId: user.id,
  });
  await insertAccountTerms(db, { accountId: account.id });

  const now = new Date();

  // Soft-delete the account
  await db
    .update(ledgerAccounts)
    .set({ deletedAt: now, deletedById: user.id })
    .where(
      and(
        eq(ledgerAccounts.id, account.id),
        eq(ledgerAccounts.userId, user.id),
      ),
    );

  // Cascade soft-delete terms (mirrors deleteAccount server fn)
  await db
    .update(accountTerms)
    .set({ deletedAt: now, deletedById: user.id })
    .where(
      and(
        eq(accountTerms.accountId, account.id),
        notDeleted(accountTerms.deletedAt),
      ),
    );

  const [terms] = await db
    .select()
    .from(accountTerms)
    .where(eq(accountTerms.accountId, account.id));

  expect(terms.deletedAt).toBeInstanceOf(Date);
  expect(terms.deletedById).toBe(user.id);
});

test('delete — already-soft-deleted account returns zero rows', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, {
    deletedAt: new Date(),
    userId: user.id,
  });

  const result = await db
    .update(ledgerAccounts)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(
      and(
        eq(ledgerAccounts.id, account.id),
        eq(ledgerAccounts.userId, user.id),
        notDeleted(ledgerAccounts.deletedAt),
      ),
    )
    .returning();

  expect(result).toHaveLength(0);
});

test('delete — writes audit log', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });

  await db
    .update(ledgerAccounts)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(
      and(
        eq(ledgerAccounts.id, account.id),
        eq(ledgerAccounts.userId, user.id),
      ),
    );

  await expectAuditLogEntry(db, {
    action: 'delete',
    actorId: user.id,
    beforeData: account as unknown as Record<string, unknown>,
    recordId: account.id,
    tableName: getTableName(ledgerAccounts),
  });
});

// ---------------------------------------------------------------------------
// Credit card catalog
// ---------------------------------------------------------------------------

test('get-credit-card-catalog — returns sorted by issuer + name', async ({
  db,
}) => {
  await insertCreditCardCatalog(db, { issuer: 'Chase', name: 'Sapphire' });
  await insertCreditCardCatalog(db, { issuer: 'Amex', name: 'Gold' });
  await insertCreditCardCatalog(db, { issuer: 'Chase', name: 'Freedom' });

  const rows = await db
    .select()
    .from(creditCardCatalog)
    .orderBy(creditCardCatalog.issuer, creditCardCatalog.name);

  expect(rows.length).toBeGreaterThanOrEqual(3);
  expect(rows[0].issuer).toBe('Amex');
  expect(rows[1].issuer).toBe('Chase');
  expect(rows[1].name).toBe('Freedom');
  expect(rows[2].name).toBe('Sapphire');
});
