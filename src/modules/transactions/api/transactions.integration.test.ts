import { and, eq, getTableName } from 'drizzle-orm';
import { expect } from 'vitest';

import {
  ledgerAccounts,
  payees,
  tags,
  transactions,
  transactionTags,
} from '@/db/schema';
import { notDeleted } from '@/lib/audit/soft-delete';
import { expectAuditLogEntry, expectPgError } from '~test/assertions';
import { insertCategory } from '~test/factories/category.factory';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertPayee } from '~test/factories/payee.factory';
import { insertTag } from '~test/factories/tag.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

/** Mirrors listTransactions payeeName suppression: null when payee is soft-deleted */
function resolvePayeeName(row: {
  payee: { deletedAt: Date | null; name: string } | null;
}): string | null {
  return row.payee?.deletedAt === null ? row.payee.name : null;
}

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
      and(
        eq(ledgerAccounts.userId, user.id),
        notDeleted(transactions.deletedAt),
      ),
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
        notDeleted(transactions.deletedAt),
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
      and(
        eq(ledgerAccounts.userId, user1.id),
        notDeleted(transactions.deletedAt),
      ),
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

test('list — returns payeeName when payee is active', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const payee = await insertPayee(db, {
    name: 'Active Payee',
    userId: user.id,
  });
  await insertTransaction(db, { accountId: account.id, payeeId: payee.id });

  // Mirrors listTransactions relational query with payee join
  const rows = await db.query.transactions.findMany({
    where: (t, { and: a }) =>
      a(eq(t.accountId, account.id), notDeleted(t.deletedAt)),
    with: { payee: { columns: { deletedAt: true, name: true } } },
  });

  expect(rows).toHaveLength(1);
  const payeeName = resolvePayeeName(rows[0]);
  expect(payeeName).toBe('Active Payee');
});

test('list — suppresses payeeName when payee is soft-deleted', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const payee = await insertPayee(db, {
    deletedAt: new Date(),
    name: 'Deleted Payee',
    userId: user.id,
  });
  await insertTransaction(db, { accountId: account.id, payeeId: payee.id });

  const rows = await db.query.transactions.findMany({
    where: (t, { and: a }) =>
      a(eq(t.accountId, account.id), notDeleted(t.deletedAt)),
    with: { payee: { columns: { deletedAt: true, name: true } } },
  });

  expect(rows).toHaveLength(1);
  const payeeName = resolvePayeeName(rows[0]);
  expect(payeeName).toBeNull();
  // But the payeeId FK is still present
  expect(rows[0].payeeId).toBe(payee.id);
});

test('list — returns null payeeName when no payee linked', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  await insertTransaction(db, { accountId: account.id });

  const rows = await db.query.transactions.findMany({
    where: (t, { and: a }) =>
      a(eq(t.accountId, account.id), notDeleted(t.deletedAt)),
    with: { payee: { columns: { deletedAt: true, name: true } } },
  });

  expect(rows).toHaveLength(1);
  expect(rows[0].payee).toBeNull();
  const payeeName = resolvePayeeName(rows[0]);
  expect(payeeName).toBeNull();
});

test('list — ordered by transactionAt DESC', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });

  const older = new Date('2024-01-15');
  const newer = new Date('2024-06-15');

  const first = await insertTransaction(db, {
    accountId: account.id,
    description: 'Older',
    transactionAt: older,
  });
  const second = await insertTransaction(db, {
    accountId: account.id,
    description: 'Newer',
    transactionAt: newer,
  });

  const rows = await db.query.transactions.findMany({
    orderBy: (t, { desc }) => desc(t.transactionAt),
    where: (t, { and: a }) =>
      a(eq(t.accountId, account.id), notDeleted(t.deletedAt)),
  });

  expect(rows).toHaveLength(2);
  expect(rows[0].id).toBe(second.id);
  expect(rows[1].id).toBe(first.id);
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

  await expectAuditLogEntry(db, {
    action: 'create',
    actorId: user.id,
    afterData: txn as unknown as Record<string, unknown>,
    recordId: txn.id,
    tableName: getTableName(transactions),
  });
});

test('create — stores null categoryId when omitted', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const now = new Date();

  const [txn] = await db
    .insert(transactions)
    .values({
      accountId: account.id,
      amountCents: 1000,
      createdById: user.id,
      description: 'No category',
      direction: 'debit',
      postedAt: now,
      transactionAt: now,
    })
    .returning();

  expect(txn.categoryId).toBeNull();
});

test('create — stores categoryId when provided', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const category = await insertCategory(db, { userId: user.id });
  const now = new Date();

  const [txn] = await db
    .insert(transactions)
    .values({
      accountId: account.id,
      amountCents: 2500,
      categoryId: category.id,
      createdById: user.id,
      description: 'With category',
      direction: 'debit',
      postedAt: now,
      transactionAt: now,
    })
    .returning();

  expect(txn.categoryId).toBe(category.id);
});

test('create — links payee to transaction', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const payee = await insertPayee(db, { userId: user.id });
  const now = new Date();

  const [txn] = await db
    .insert(transactions)
    .values({
      accountId: account.id,
      amountCents: 3000,
      createdById: user.id,
      description: 'Linked payee',
      direction: 'debit',
      payeeId: payee.id,
      postedAt: now,
      transactionAt: now,
    })
    .returning();

  expect(txn.payeeId).toBe(payee.id);
});

test('create — links multiple tags via transactionTags', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const tag1 = await insertTag(db, { userId: user.id });
  const tag2 = await insertTag(db, { userId: user.id });
  const now = new Date();

  const [txn] = await db
    .insert(transactions)
    .values({
      accountId: account.id,
      amountCents: 4000,
      createdById: user.id,
      description: 'Multi-tag',
      direction: 'debit',
      postedAt: now,
      transactionAt: now,
    })
    .returning();

  await db.insert(transactionTags).values([
    { tagId: tag1.id, transactionId: txn.id },
    { tagId: tag2.id, transactionId: txn.id },
  ]);

  const rows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  expect(rows).toHaveLength(2);
  const tagIds = rows.map((r) => r.tagId);
  expect(tagIds).toContain(tag1.id);
  expect(tagIds).toContain(tag2.id);
});

test('create — transactionTags rejects duplicate (transactionId, tagId)', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const tag = await insertTag(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });

  await db.insert(transactionTags).values({
    tagId: tag.id,
    transactionId: txn.id,
  });

  await expectPgError(
    () =>
      db.insert(transactionTags).values({
        tagId: tag.id,
        transactionId: txn.id,
      }),
    { code: '23505', constraint: 'transaction_tags_unique_idx' },
  );
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
// Inline payee creation (mirrors createTransaction lines 44-80)
// ---------------------------------------------------------------------------

test('create — inline payee: inserts new payee with normalized name', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const now = new Date();
  const newPayeeName = '  Acme Corp  ';
  const normalizedName = newPayeeName.trim().toLowerCase();

  const [newPayee] = await db
    .insert(payees)
    .values({
      createdById: user.id,
      name: newPayeeName.trim(),
      normalizedName,
      userId: user.id,
    })
    .returning();

  const [txn] = await db
    .insert(transactions)
    .values({
      accountId: account.id,
      amountCents: 1000,
      createdById: user.id,
      description: 'Inline payee test',
      direction: 'debit',
      payeeId: newPayee.id,
      postedAt: now,
      transactionAt: now,
    })
    .returning();

  expect(newPayee.name).toBe('Acme Corp');
  expect(newPayee.normalizedName).toBe('acme corp');
  expect(txn.payeeId).toBe(newPayee.id);
});

test('create — inline payee: reuses existing on normalized match', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const now = new Date();

  // Pre-insert the payee
  const existing = await insertPayee(db, {
    name: 'Acme Corp',
    normalizedName: 'acme corp',
    userId: user.id,
  });

  const normalizedName = '  ACME CORP  '.trim().toLowerCase();

  const found = await db
    .select()
    .from(payees)
    .where(
      and(
        eq(payees.normalizedName, normalizedName),
        eq(payees.userId, user.id),
        notDeleted(payees.deletedAt),
      ),
    );

  const payeeId = found.length > 0 ? found[0].id : null;

  const [txn] = await db
    .insert(transactions)
    .values({
      accountId: account.id,
      amountCents: 2000,
      createdById: user.id,
      description: 'Reuse payee test',
      direction: 'debit',
      payeeId,
      postedAt: now,
      transactionAt: now,
    })
    .returning();

  expect(payeeId).toBe(existing.id);
  expect(txn.payeeId).toBe(existing.id);

  // Verify no duplicate payee was created
  const allPayees = await db
    .select()
    .from(payees)
    .where(
      and(eq(payees.normalizedName, 'acme corp'), eq(payees.userId, user.id)),
    );

  expect(allPayees).toHaveLength(1);
});

test('create — inline payee: re-creates after soft-delete (partial index)', async ({
  db,
}) => {
  const user = await insertUser(db);

  // Soft-deleted payee with matching name
  await insertPayee(db, {
    deletedAt: new Date(),
    name: 'Gone Corp',
    normalizedName: 'gone corp',
    userId: user.id,
  });

  // Partial unique index allows inserting a new payee with the same name
  const fresh = await insertPayee(db, {
    name: 'Gone Corp',
    normalizedName: 'gone corp',
    userId: user.id,
  });

  expect(fresh.name).toBe('Gone Corp');
  expect(fresh.deletedAt).toBeNull();

  const all = await db
    .select()
    .from(payees)
    .where(
      and(eq(payees.normalizedName, 'gone corp'), eq(payees.userId, user.id)),
    );
  expect(all).toHaveLength(2);
});

// ---------------------------------------------------------------------------
// Inline tag creation (mirrors createTransaction lines 109-147)
// ---------------------------------------------------------------------------

test('create — inline tags: creates new tags within transaction', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const now = new Date();
  const newTagNames = ['groceries', 'personal'];

  const [txn] = await db
    .insert(transactions)
    .values({
      accountId: account.id,
      amountCents: 5000,
      createdById: user.id,
      description: 'Inline tags test',
      direction: 'debit',
      postedAt: now,
      transactionAt: now,
    })
    .returning();

  const insertedTags = await db
    .insert(tags)
    .values(
      newTagNames.map((name) => ({
        createdById: user.id,
        name: name.trim(),
        userId: user.id,
      })),
    )
    .returning();

  await db.insert(transactionTags).values(
    insertedTags.map((tag) => ({
      createdById: user.id,
      tagId: tag.id,
      transactionId: txn.id,
    })),
  );

  const tagRows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  expect(tagRows).toHaveLength(2);
});

test('create — inline tags: reuses existing tag on exact match', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const now = new Date();

  // Pre-insert a tag
  const existingTag = await insertTag(db, {
    name: 'groceries',
    userId: user.id,
  });

  const [txn] = await db
    .insert(transactions)
    .values({
      accountId: account.id,
      amountCents: 3000,
      createdById: user.id,
      description: 'Reuse tag test',
      direction: 'debit',
      postedAt: now,
      transactionAt: now,
    })
    .returning();

  const found = await db
    .select()
    .from(tags)
    .where(
      and(
        eq(tags.name, 'groceries'),
        eq(tags.userId, user.id),
        notDeleted(tags.deletedAt),
      ),
    );

  const tagId = found.length > 0 ? found[0].id : null;

  await db.insert(transactionTags).values({
    createdById: user.id,
    tagId: tagId!,
    transactionId: txn.id,
  });

  expect(tagId).toBe(existingTag.id);

  // Verify no duplicate tag was created
  const allTags = await db
    .select()
    .from(tags)
    .where(and(eq(tags.name, 'groceries'), eq(tags.userId, user.id)));

  expect(allTags).toHaveLength(1);

  const tagRows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  expect(tagRows).toHaveLength(1);
  expect(tagRows[0].tagId).toBe(existingTag.id);
});

test('create — inline tags: deduplicates via Set', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const tag = await insertTag(db, { userId: user.id });
  const now = new Date();

  // Simulate duplicate tagIds that the server fn deduplicates with new Set()
  const duplicateTagIds = [tag.id, tag.id, tag.id];
  const uniqueTagIds = [...new Set(duplicateTagIds)];

  const [txn] = await db
    .insert(transactions)
    .values({
      accountId: account.id,
      amountCents: 1500,
      createdById: user.id,
      description: 'Dedup Set test',
      direction: 'debit',
      postedAt: now,
      transactionAt: now,
    })
    .returning();

  await db.insert(transactionTags).values(
    uniqueTagIds.map((tagId) => ({
      createdById: user.id,
      tagId,
      transactionId: txn.id,
    })),
  );

  const tagRows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  expect(tagRows).toHaveLength(1);
  expect(tagRows[0].tagId).toBe(tag.id);
});

test('create — inline tags: skips empty and whitespace-only names', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const now = new Date();
  // Mirrors server fn line 113: if (!trimmed) continue
  const newTagNames = ['valid-tag', '', '   ', 'another-tag'];

  const [txn] = await db
    .insert(transactions)
    .values({
      accountId: account.id,
      amountCents: 2000,
      createdById: user.id,
      description: 'Skip empty tags test',
      direction: 'debit',
      postedAt: now,
      transactionAt: now,
    })
    .returning();

  const validNames = newTagNames.map((n) => n.trim()).filter(Boolean);

  const insertedTags = await db
    .insert(tags)
    .values(
      validNames.map((name) => ({
        createdById: user.id,
        name,
        userId: user.id,
      })),
    )
    .returning();

  await db.insert(transactionTags).values(
    insertedTags.map((tag) => ({
      createdById: user.id,
      tagId: tag.id,
      transactionId: txn.id,
    })),
  );

  expect(insertedTags).toHaveLength(2);

  const tagRows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  expect(tagRows).toHaveLength(2);
});

test('create — inline tags: Set dedup across tagIds and newTagNames', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const now = new Date();

  // Pre-insert a tag that will overlap with newTagNames
  const existingTag = await insertTag(db, {
    name: 'shared-tag',
    userId: user.id,
  });

  const [txn] = await db
    .insert(transactions)
    .values({
      accountId: account.id,
      amountCents: 4000,
      createdById: user.id,
      description: 'Mixed dedup test',
      direction: 'debit',
      postedAt: now,
      transactionAt: now,
    })
    .returning();

  // Start with existing tagId
  const allTagIds = [existingTag.id];

  // Inline-create resolves to same tag via lookup
  const found = await db
    .select()
    .from(tags)
    .where(
      and(
        eq(tags.name, 'shared-tag'),
        eq(tags.userId, user.id),
        notDeleted(tags.deletedAt),
      ),
    );

  if (found.length > 0) {
    allTagIds.push(found[0].id);
  }

  // Set dedup removes the duplicate
  const uniqueTagIds = [...new Set(allTagIds)];

  await db.insert(transactionTags).values(
    uniqueTagIds.map((tagId) => ({
      createdById: user.id,
      tagId,
      transactionId: txn.id,
    })),
  );

  expect(found).toHaveLength(1);
  expect(uniqueTagIds).toHaveLength(1);

  const tagRows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  expect(tagRows).toHaveLength(1);
  expect(tagRows[0].tagId).toBe(existingTag.id);
});

test('create — soft-deleted account excluded by notDeleted filter', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, {
    deletedAt: new Date(),
    userId: user.id,
  });

  // Mirrors server fn account ownership check (lines 27-34)
  const found = await db
    .select()
    .from(ledgerAccounts)
    .where(
      and(
        eq(ledgerAccounts.id, account.id),
        eq(ledgerAccounts.userId, user.id),
        notDeleted(ledgerAccounts.deletedAt),
      ),
    );

  expect(found).toHaveLength(0);
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
// Update — inline payee creation (mirrors updateTransaction lines 83-116)
// ---------------------------------------------------------------------------

test('update — inline payee: inserts new payee with normalized name', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });
  const newPayeeName = '  New Vendor  ';

  const normalizedName = newPayeeName.trim().toLowerCase();

  const [newPayee] = await db
    .insert(payees)
    .values({
      createdById: user.id,
      name: newPayeeName.trim(),
      normalizedName,
      userId: user.id,
    })
    .returning();

  const [updated] = await db
    .update(transactions)
    .set({ payeeId: newPayee.id, updatedById: user.id })
    .where(eq(transactions.id, txn.id))
    .returning();

  expect(newPayee.name).toBe('New Vendor');
  expect(newPayee.normalizedName).toBe('new vendor');
  expect(updated.payeeId).toBe(newPayee.id);
});

test('update — inline payee: reuses existing on normalized match', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });

  const existing = await insertPayee(db, {
    name: 'Acme Corp',
    normalizedName: 'acme corp',
    userId: user.id,
  });

  const normalizedName = '  ACME CORP  '.trim().toLowerCase();

  const found = await db
    .select()
    .from(payees)
    .where(
      and(
        eq(payees.normalizedName, normalizedName),
        eq(payees.userId, user.id),
        notDeleted(payees.deletedAt),
      ),
    );

  const payeeId = found.length > 0 ? found[0].id : null;

  const [updated] = await db
    .update(transactions)
    .set({ payeeId, updatedById: user.id })
    .where(eq(transactions.id, txn.id))
    .returning();

  expect(payeeId).toBe(existing.id);
  expect(updated.payeeId).toBe(existing.id);

  const allPayees = await db
    .select()
    .from(payees)
    .where(
      and(eq(payees.normalizedName, 'acme corp'), eq(payees.userId, user.id)),
    );

  expect(allPayees).toHaveLength(1);
});

// ---------------------------------------------------------------------------
// Update — inline tag creation (mirrors updateTransaction lines 145-197)
// ---------------------------------------------------------------------------

test('update — inline tags: creates new tags during update', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });
  const existingTag = await insertTag(db, { userId: user.id });

  // Link initial tag
  await db.insert(transactionTags).values({
    createdById: user.id,
    tagId: existingTag.id,
    transactionId: txn.id,
  });

  const newTagNames = ['new-tag-a', 'new-tag-b'];

  // Delete-and-reinsert pattern from updateTransaction
  await db
    .delete(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  const validNames = newTagNames.map((n) => n.trim()).filter(Boolean);

  const insertedTags = await db
    .insert(tags)
    .values(
      validNames.map((name) => ({
        createdById: user.id,
        name,
        userId: user.id,
      })),
    )
    .returning();

  await db.insert(transactionTags).values(
    insertedTags.map((tag) => ({
      createdById: user.id,
      tagId: tag.id,
      transactionId: txn.id,
    })),
  );

  expect(insertedTags).toHaveLength(2);

  const tagRows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  expect(tagRows).toHaveLength(2);

  // Old tag should have been removed by delete-reinsert
  const tagIdSet = new Set(tagRows.map((r) => r.tagId));
  expect(tagIdSet.has(existingTag.id)).toBe(false);
});

test('update — inline tags: reuses existing tag on exact match', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });

  const existingTag = await insertTag(db, {
    name: 'groceries',
    userId: user.id,
  });

  await db
    .delete(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  const allTagIds: string[] = [];

  const found = await db
    .select()
    .from(tags)
    .where(
      and(
        eq(tags.name, 'groceries'),
        eq(tags.userId, user.id),
        notDeleted(tags.deletedAt),
      ),
    );

  if (found.length > 0) {
    allTagIds.push(found[0].id);
  }

  if (allTagIds.length > 0) {
    await db.insert(transactionTags).values(
      allTagIds.map((tagId) => ({
        createdById: user.id,
        tagId,
        transactionId: txn.id,
      })),
    );
  }

  expect(allTagIds[0]).toBe(existingTag.id);

  // No duplicate tag created
  const allTags = await db
    .select()
    .from(tags)
    .where(and(eq(tags.name, 'groceries'), eq(tags.userId, user.id)));

  expect(allTags).toHaveLength(1);
});

test('update — inline tags: deduplicates tagIds + newTagNames via Set', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });

  const existingTag = await insertTag(db, {
    name: 'shared-tag',
    userId: user.id,
  });

  await db
    .delete(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  // tagIds contains the existing tag
  const allTagIds = [existingTag.id];

  // newTagNames resolves to the same tag via lookup
  const found = await db
    .select()
    .from(tags)
    .where(
      and(
        eq(tags.name, 'shared-tag'),
        eq(tags.userId, user.id),
        notDeleted(tags.deletedAt),
      ),
    );

  if (found.length > 0) {
    allTagIds.push(found[0].id);
  }

  const uniqueTagIds = [...new Set(allTagIds)];

  await db.insert(transactionTags).values(
    uniqueTagIds.map((tagId) => ({
      createdById: user.id,
      tagId,
      transactionId: txn.id,
    })),
  );

  expect(found).toHaveLength(1);
  expect(uniqueTagIds).toHaveLength(1);

  const tagRows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  expect(tagRows).toHaveLength(1);
  expect(tagRows[0].tagId).toBe(existingTag.id);
});

test('update — tag removal: empty tagIds clears all tags', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });
  const tag = await insertTag(db, { userId: user.id });

  await db.insert(transactionTags).values({
    createdById: user.id,
    tagId: tag.id,
    transactionId: txn.id,
  });

  // Mirrors updateTransaction: tagIds=[] triggers delete, no re-insert
  await db
    .delete(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  const tagRows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  expect(tagRows).toHaveLength(0);
});

test('update — partial update preserves existing tags', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });
  const tag = await insertTag(db, { userId: user.id });

  await db.insert(transactionTags).values({
    createdById: user.id,
    tagId: tag.id,
    transactionId: txn.id,
  });

  // Update only description — neither tagIds nor newTagNames provided
  await db
    .update(transactions)
    .set({ description: 'Updated description', updatedById: user.id })
    .where(eq(transactions.id, txn.id));

  const tagRows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  expect(tagRows).toHaveLength(1);
  expect(tagRows[0].tagId).toBe(tag.id);
});

test('update — account transfer rejects non-owned account', async ({ db }) => {
  const owner = await insertUser(db);
  const other = await insertUser(db);
  const ownerAccount = await insertLedgerAccount(db, { userId: owner.id });
  const otherAccount = await insertLedgerAccount(db, { userId: other.id });
  await insertTransaction(db, { accountId: ownerAccount.id });

  // Verify the other user's account is not visible to owner
  const found = await db
    .select()
    .from(ledgerAccounts)
    .where(
      and(
        eq(ledgerAccounts.id, otherAccount.id),
        eq(ledgerAccounts.userId, owner.id),
        notDeleted(ledgerAccounts.deletedAt),
      ),
    );

  expect(found).toHaveLength(0);
});

test('update — account transfer rejects soft-deleted account', async ({
  db,
}) => {
  const user = await insertUser(db);
  const activeAccount = await insertLedgerAccount(db, { userId: user.id });
  const deletedAccount = await insertLedgerAccount(db, {
    deletedAt: new Date(),
    userId: user.id,
  });
  await insertTransaction(db, { accountId: activeAccount.id });

  const found = await db
    .select()
    .from(ledgerAccounts)
    .where(
      and(
        eq(ledgerAccounts.id, deletedAccount.id),
        eq(ledgerAccounts.userId, user.id),
        notDeleted(ledgerAccounts.deletedAt),
      ),
    );

  expect(found).toHaveLength(0);
});

test('update — writes audit log', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, {
    accountId: account.id,
    description: 'Before update',
  });

  await db
    .update(transactions)
    .set({ description: 'After update', updatedById: user.id })
    .where(eq(transactions.id, txn.id));

  await expectAuditLogEntry(db, {
    action: 'update',
    actorId: user.id,
    afterData: { description: 'After update' } as Record<string, unknown>,
    beforeData: { description: 'Before update' } as Record<string, unknown>,
    recordId: txn.id,
    tableName: getTableName(transactions),
  });
});

test('update — transactionAt coercion sets both transactionAt and postedAt', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, {
    accountId: account.id,
    postedAt: new Date('2024-01-01'),
    transactionAt: new Date('2024-01-01'),
  });

  const newDate = new Date('2024-06-15');

  const [updated] = await db
    .update(transactions)
    .set({
      postedAt: newDate,
      transactionAt: newDate,
      updatedById: user.id,
    })
    .where(eq(transactions.id, txn.id))
    .returning();

  expect(updated.transactionAt).toEqual(newDate);
  expect(updated.postedAt).toEqual(newDate);
});

test('update — omitting transactionAt preserves existing dates', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const originalDate = new Date('2024-03-20');
  const txn = await insertTransaction(db, {
    accountId: account.id,
    postedAt: originalDate,
    transactionAt: originalDate,
  });

  // Update only description, no transactionAt
  const [updated] = await db
    .update(transactions)
    .set({ description: 'Updated desc', updatedById: user.id })
    .where(eq(transactions.id, txn.id))
    .returning();

  expect(updated.transactionAt).toEqual(originalDate);
  expect(updated.postedAt).toEqual(originalDate);
  expect(updated.description).toBe('Updated desc');
});

test('update — soft-deleted transaction is not found', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, {
    accountId: account.id,
    deletedAt: new Date(),
  });

  // Mirrors ensureFound in updateTransaction: notDeleted filter excludes it
  const result = await db
    .select()
    .from(transactions)
    .innerJoin(ledgerAccounts, eq(ledgerAccounts.id, transactions.accountId))
    .where(
      and(
        eq(transactions.id, txn.id),
        eq(ledgerAccounts.userId, user.id),
        notDeleted(transactions.deletedAt),
      ),
    );

  expect(result).toHaveLength(0);
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

test('delete — writes audit log', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });

  await db
    .update(transactions)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(eq(transactions.id, txn.id));

  await expectAuditLogEntry(db, {
    action: 'delete',
    actorId: user.id,
    beforeData: txn as unknown as Record<string, unknown>,
    recordId: txn.id,
    tableName: getTableName(transactions),
  });
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

test('delete — already-deleted transaction is excluded by notDeleted filter', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });

  // First soft-delete
  await db
    .update(transactions)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(eq(transactions.id, txn.id));

  // Second attempt mirrors service: ownership join + notDeleted filter
  const result = await db
    .select()
    .from(transactions)
    .innerJoin(ledgerAccounts, eq(ledgerAccounts.id, transactions.accountId))
    .where(
      and(
        eq(transactions.id, txn.id),
        eq(ledgerAccounts.userId, user.id),
        notDeleted(transactions.deletedAt),
      ),
    );

  expect(result).toHaveLength(0);
});

test('delete — transaction tags remain in DB after soft-delete', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });
  const tag = await insertTag(db, { userId: user.id });

  await db
    .insert(transactionTags)
    .values({ tagId: tag.id, transactionId: txn.id });

  // Soft-delete the transaction
  await db
    .update(transactions)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(eq(transactions.id, txn.id));

  // Tag association rows still exist
  const tagRows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  expect(tagRows).toHaveLength(1);
  expect(tagRows[0].tagId).toBe(tag.id);
});

test('update — sets category on transaction', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const category = await insertCategory(db, {
    type: 'expense',
    userId: user.id,
  });
  const txn = await insertTransaction(db, { accountId: account.id });

  const [updated] = await db
    .update(transactions)
    .set({ categoryId: category.id, updatedById: user.id })
    .where(eq(transactions.id, txn.id))
    .returning();

  expect(updated.categoryId).toBe(category.id);
});

test('update — sets payee on transaction', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const payee = await insertPayee(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });

  const [updated] = await db
    .update(transactions)
    .set({ payeeId: payee.id, updatedById: user.id })
    .where(eq(transactions.id, txn.id))
    .returning();

  expect(updated.payeeId).toBe(payee.id);
});

test('update — changes direction', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, {
    accountId: account.id,
    direction: 'debit',
  });

  const [updated] = await db
    .update(transactions)
    .set({ direction: 'credit', updatedById: user.id })
    .where(eq(transactions.id, txn.id))
    .returning();

  expect(updated.direction).toBe('credit');
});

test('update — multiple fields in one operation', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const category = await insertCategory(db, {
    type: 'expense',
    userId: user.id,
  });
  const payee = await insertPayee(db, { userId: user.id });
  const txn = await insertTransaction(db, {
    accountId: account.id,
    amountCents: 1000,
    description: 'Original',
    direction: 'debit',
  });

  const [updated] = await db
    .update(transactions)
    .set({
      amountCents: 5000,
      categoryId: category.id,
      description: 'Updated',
      direction: 'credit',
      payeeId: payee.id,
      updatedById: user.id,
    })
    .where(eq(transactions.id, txn.id))
    .returning();

  expect(updated.amountCents).toBe(5000);
  expect(updated.categoryId).toBe(category.id);
  expect(updated.description).toBe('Updated');
  expect(updated.direction).toBe('credit');
  expect(updated.payeeId).toBe(payee.id);
  expect(updated.updatedById).toBe(user.id);
});

test('update — ownership check via account join', async ({ db }) => {
  const owner = await insertUser(db);
  const other = await insertUser(db);
  const ownerAccount = await insertLedgerAccount(db, { userId: owner.id });
  const txn = await insertTransaction(db, { accountId: ownerAccount.id });

  const result = await db
    .select()
    .from(transactions)
    .innerJoin(ledgerAccounts, eq(ledgerAccounts.id, transactions.accountId))
    .where(
      and(eq(transactions.id, txn.id), eq(ledgerAccounts.userId, other.id)),
    );

  expect(result).toHaveLength(0);
});

test('update — clears categoryId to null', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const category = await insertCategory(db, {
    type: 'expense',
    userId: user.id,
  });
  const txn = await insertTransaction(db, {
    accountId: account.id,
    categoryId: category.id,
  });

  const [updated] = await db
    .update(transactions)
    .set({ categoryId: null, updatedById: user.id })
    .where(eq(transactions.id, txn.id))
    .returning();

  expect(updated.categoryId).toBeNull();
});

// ---------------------------------------------------------------------------
// Cross-user resource linking
// ---------------------------------------------------------------------------

test('create — cross-user categoryId accepted by DB (no ownership FK)', async ({
  db,
}) => {
  const userA = await insertUser(db);
  const userB = await insertUser(db);
  const accountA = await insertLedgerAccount(db, { userId: userA.id });
  const categoryB = await insertCategory(db, {
    type: 'expense',
    userId: userB.id,
  });

  // DB FK only checks categories.id, not userId — insert succeeds
  const [txn] = await db
    .insert(transactions)
    .values({
      accountId: accountA.id,
      amountCents: 1000,
      categoryId: categoryB.id,
      createdById: userA.id,
      description: 'cross-user category',
      direction: 'debit',
      postedAt: new Date(),
      transactionAt: new Date(),
    })
    .returning();

  expect(txn.categoryId).toBe(categoryB.id);

  // Ownership query pattern: userId filter correctly excludes it
  const owned = await db.query.categories.findFirst({
    where: (t, { and: a, eq: e }) =>
      a(e(t.id, categoryB.id), e(t.userId, userA.id)),
  });
  expect(owned).toBeUndefined();
});

test('create — cross-user payeeId accepted by DB (no ownership FK)', async ({
  db,
}) => {
  const userA = await insertUser(db);
  const userB = await insertUser(db);
  const accountA = await insertLedgerAccount(db, { userId: userA.id });
  const payeeB = await insertPayee(db, { userId: userB.id });

  const [txn] = await db
    .insert(transactions)
    .values({
      accountId: accountA.id,
      amountCents: 1000,
      createdById: userA.id,
      description: 'cross-user payee',
      direction: 'debit',
      payeeId: payeeB.id,
      postedAt: new Date(),
      transactionAt: new Date(),
    })
    .returning();

  expect(txn.payeeId).toBe(payeeB.id);

  // Ownership query pattern: userId filter correctly excludes it
  const owned = await db.query.payees.findFirst({
    where: (t, { and: a, eq: e }) =>
      a(e(t.id, payeeB.id), e(t.userId, userA.id)),
  });
  expect(owned).toBeUndefined();
});

test('create — cross-user tagId accepted by DB (no ownership FK)', async ({
  db,
}) => {
  const userA = await insertUser(db);
  const userB = await insertUser(db);
  const accountA = await insertLedgerAccount(db, { userId: userA.id });
  const tagB = await insertTag(db, { userId: userB.id });
  const txn = await insertTransaction(db, { accountId: accountA.id });

  // transactionTags FK only checks tags.id, not userId
  await db
    .insert(transactionTags)
    .values({ tagId: tagB.id, transactionId: txn.id });

  const rows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, txn.id));

  expect(rows).toHaveLength(1);
  expect(rows[0].tagId).toBe(tagB.id);

  // Ownership query pattern: userId filter correctly excludes it
  const owned = await db.query.tags.findFirst({
    where: (t, { and: a, eq: e }) => a(e(t.id, tagB.id), e(t.userId, userA.id)),
  });
  expect(owned).toBeUndefined();
});
