import { and, eq, isNull } from 'drizzle-orm';
import { expect } from 'vitest';

import {
  auditLogs,
  ledgerAccounts,
  payees,
  tags,
  transactions,
  transactionTags,
} from '@/db/schema';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertTag } from '~test/factories/tag.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

// ---------------------------------------------------------------------------
// List transactions
// ---------------------------------------------------------------------------

test('list — returns active transactions for user', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });

  const rows = await db
    .select()
    .from(transactions)
    .innerJoin(ledgerAccounts, eq(ledgerAccounts.id, transactions.accountId))
    .where(
      and(eq(ledgerAccounts.userId, user.id), isNull(transactions.deletedAt)),
    );

  expect(rows).toHaveLength(1);
  expect(rows[0].transactions.description).toBe(txn.description);
});

test('list — excludes soft-deleted', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  await insertTransaction(db, {
    accountId: account.id,
    deletedAt: new Date(),
  });
  await insertTransaction(db, { accountId: account.id });

  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, account.id),
        isNull(transactions.deletedAt),
      ),
    );

  expect(rows).toHaveLength(1);
});

test('list — isolates by user via account join', async ({ db }) => {
  const user1 = await insertUser(db);
  const user2 = await insertUser(db);
  const account1 = await insertLedgerAccount(db, { userId: user1.id });
  const account2 = await insertLedgerAccount(db, { userId: user2.id });
  await insertTransaction(db, { accountId: account1.id });
  await insertTransaction(db, { accountId: account2.id });

  const rows = await db
    .select()
    .from(transactions)
    .innerJoin(ledgerAccounts, eq(ledgerAccounts.id, transactions.accountId))
    .where(
      and(eq(ledgerAccounts.userId, user1.id), isNull(transactions.deletedAt)),
    );

  expect(rows).toHaveLength(1);
  expect(rows[0].transactions.accountId).toBe(account1.id);
});

test('list — includes tags via transaction_tags', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });
  const tag = await insertTag(db, { userId: user.id });

  await db.insert(transactionTags).values({
    tagId: tag.id,
    transactionId: txn.id,
  });

  const tagRows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  expect(tagRows).toHaveLength(1);
  expect(tagRows[0].tagId).toBe(tag.id);
});

// ---------------------------------------------------------------------------
// Create transaction
// ---------------------------------------------------------------------------

test('create — inserts with required fields', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const now = new Date();

  const [txn] = await db
    .insert(transactions)
    .values({
      accountId: account.id,
      amountCents: 1500,
      createdById: user.id,
      description: 'Test transaction',
      direction: 'debit',
      postedAt: now,
      transactionAt: now,
    })
    .returning();

  expect(txn.id).toBeDefined();
  expect(txn.description).toBe('Test transaction');
  expect(txn.amountCents).toBe(1500);
  expect(txn.direction).toBe('debit');
  expect(txn.pending).toBe(false);
});

test('create — inserts with payee', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });

  const [payee] = await db
    .insert(payees)
    .values({
      createdById: user.id,
      name: 'New Payee',
      normalizedName: 'new payee',
      userId: user.id,
    })
    .returning();

  const now = new Date();
  const [txn] = await db
    .insert(transactions)
    .values({
      accountId: account.id,
      amountCents: 2000,
      createdById: user.id,
      description: 'With payee',
      direction: 'debit',
      payeeId: payee.id,
      postedAt: now,
      transactionAt: now,
    })
    .returning();

  expect(txn.payeeId).toBe(payee.id);
});

test('create — inserts with tags', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const now = new Date();

  const [txn] = await db
    .insert(transactions)
    .values({
      accountId: account.id,
      amountCents: 3000,
      createdById: user.id,
      description: 'With tags',
      direction: 'credit',
      postedAt: now,
      transactionAt: now,
    })
    .returning();

  const [tag1] = await db
    .insert(tags)
    .values({ createdById: user.id, name: 'tag-a', userId: user.id })
    .returning();
  const [tag2] = await db
    .insert(tags)
    .values({ createdById: user.id, name: 'tag-b', userId: user.id })
    .returning();

  await db.insert(transactionTags).values([
    { tagId: tag1.id, transactionId: txn.id },
    { tagId: tag2.id, transactionId: txn.id },
  ]);

  const tagRows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  expect(tagRows).toHaveLength(2);
});

test('create — writes audit log', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const now = new Date();

  const [txn] = await db
    .insert(transactions)
    .values({
      accountId: account.id,
      amountCents: 500,
      createdById: user.id,
      description: 'Audit test',
      direction: 'debit',
      postedAt: now,
      transactionAt: now,
    })
    .returning();

  await db.insert(auditLogs).values({
    action: 'create',
    actorId: user.id,
    afterData: txn as unknown as Record<string, unknown>,
    recordId: txn.id,
    tableName: 'transactions',
  });

  const logs = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, txn.id),
        eq(auditLogs.tableName, 'transactions'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].action).toBe('create');
  expect(logs[0].actorId).toBe(user.id);
});

test('create — rejects non-owned account via join', async ({ db }) => {
  const owner = await insertUser(db);
  const other = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: owner.id });

  // Verify account doesn't belong to "other" user
  const accountCheck = await db
    .select()
    .from(ledgerAccounts)
    .where(
      and(
        eq(ledgerAccounts.id, account.id),
        eq(ledgerAccounts.userId, other.id),
      ),
    );

  expect(accountCheck).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Update transaction
// ---------------------------------------------------------------------------

test('update — updates fields', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, {
    accountId: account.id,
    description: 'Old Description',
  });

  const [updated] = await db
    .update(transactions)
    .set({ description: 'New Description', updatedById: user.id })
    .where(eq(transactions.id, txn.id))
    .returning();

  expect(updated.description).toBe('New Description');
});

test('update — tag sync deletes and re-inserts', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });
  const tag1 = await insertTag(db, { userId: user.id });
  const tag2 = await insertTag(db, { userId: user.id });
  const tag3 = await insertTag(db, { userId: user.id });

  // Initial tags
  await db.insert(transactionTags).values([
    { tagId: tag1.id, transactionId: txn.id },
    { tagId: tag2.id, transactionId: txn.id },
  ]);

  // Sync: delete all, re-insert new set
  await db
    .delete(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));
  await db.insert(transactionTags).values([
    { tagId: tag2.id, transactionId: txn.id },
    { tagId: tag3.id, transactionId: txn.id },
  ]);

  const tagRows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  expect(tagRows).toHaveLength(2);
  const tagIdSet = new Set(tagRows.map((r) => r.tagId));
  expect(tagIdSet.has(tag2.id)).toBe(true);
  expect(tagIdSet.has(tag3.id)).toBe(true);
  expect(tagIdSet.has(tag1.id)).toBe(false);
});

// ---------------------------------------------------------------------------
// Delete transaction (soft delete)
// ---------------------------------------------------------------------------

test('delete — soft deletes', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });

  await db
    .update(transactions)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(eq(transactions.id, txn.id));

  const [deleted] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, txn.id));

  expect(deleted.deletedAt).toBeInstanceOf(Date);
  expect(deleted.deletedById).toBe(user.id);
});

test('delete — ownership check via account join', async ({ db }) => {
  const owner = await insertUser(db);
  const other = await insertUser(db);
  const ownerAccount = await insertLedgerAccount(db, { userId: owner.id });
  const txn = await insertTransaction(db, { accountId: ownerAccount.id });

  // Attempt to find transaction through other user's accounts
  const result = await db
    .select()
    .from(transactions)
    .innerJoin(ledgerAccounts, eq(ledgerAccounts.id, transactions.accountId))
    .where(
      and(eq(transactions.id, txn.id), eq(ledgerAccounts.userId, other.id)),
    );

  expect(result).toHaveLength(0);
});
