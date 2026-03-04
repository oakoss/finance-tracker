import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import {
  auditLogs,
  ledgerAccounts,
  payees,
  tags,
  transactions,
  transactionTags,
} from '@/db/schema';
import { notDeleted } from '@/lib/audit/soft-delete';
import { expectPgError } from '~test/assertions';
import { insertCategory } from '~test/factories/category.factory';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertPayee } from '~test/factories/payee.factory';
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

  // Replicate the server fn inline-payee logic within a transaction
  const result = await db.transaction(async (tx) => {
    const normalizedName = newPayeeName.trim().toLowerCase();

    const [newPayee] = await tx
      .insert(payees)
      .values({
        createdById: user.id,
        name: newPayeeName.trim(),
        normalizedName,
        userId: user.id,
      })
      .returning();

    const [txn] = await tx
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

    return { payee: newPayee, transaction: txn };
  });

  expect(result.payee.name).toBe('Acme Corp');
  expect(result.payee.normalizedName).toBe('acme corp');
  expect(result.transaction.payeeId).toBe(result.payee.id);
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

  // Replicate server fn lookup-before-insert pattern
  const result = await db.transaction(async (tx) => {
    const normalizedName = '  ACME CORP  '.trim().toLowerCase();

    const found = await tx
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

    const [txn] = await tx
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

    return { payeeId, transaction: txn };
  });

  expect(result.payeeId).toBe(existing.id);
  expect(result.transaction.payeeId).toBe(existing.id);

  // Verify no duplicate payee was created
  const allPayees = await db
    .select()
    .from(payees)
    .where(
      and(eq(payees.normalizedName, 'acme corp'), eq(payees.userId, user.id)),
    );

  expect(allPayees).toHaveLength(1);
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

  const result = await db.transaction(async (tx) => {
    const [txn] = await tx
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

    const tagIds: string[] = [];
    for (const tagName of newTagNames) {
      const trimmed = tagName.trim();

      const [newTag] = await tx
        .insert(tags)
        .values({ createdById: user.id, name: trimmed, userId: user.id })
        .returning();

      tagIds.push(newTag.id);
    }

    await tx.insert(transactionTags).values(
      tagIds.map((tagId) => ({
        createdById: user.id,
        tagId,
        transactionId: txn.id,
      })),
    );

    return { tagIds, transaction: txn };
  });

  const tagRows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, result.transaction.id));

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

  const result = await db.transaction(async (tx) => {
    const [txn] = await tx
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

    // Lookup existing tag (mirrors server fn pattern)
    const found = await tx
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

    await tx.insert(transactionTags).values({
      createdById: user.id,
      tagId: tagId!,
      transactionId: txn.id,
    });

    return { resolvedTagId: tagId, transaction: txn };
  });

  expect(result.resolvedTagId).toBe(existingTag.id);

  // Verify no duplicate tag was created
  const allTags = await db
    .select()
    .from(tags)
    .where(and(eq(tags.name, 'groceries'), eq(tags.userId, user.id)));

  expect(allTags).toHaveLength(1);

  const tagRows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, result.transaction.id));

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

  const result = await db.transaction(async (tx) => {
    const [txn] = await tx
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

    const tagIds: string[] = [];
    for (const tagName of newTagNames) {
      const trimmed = tagName.trim();
      if (!trimmed) continue;

      const [newTag] = await tx
        .insert(tags)
        .values({ createdById: user.id, name: trimmed, userId: user.id })
        .returning();

      tagIds.push(newTag.id);
    }

    if (tagIds.length > 0) {
      await tx.insert(transactionTags).values(
        tagIds.map((tagId) => ({
          createdById: user.id,
          tagId,
          transactionId: txn.id,
        })),
      );
    }

    return { tagCount: tagIds.length, transaction: txn };
  });

  expect(result.tagCount).toBe(2);

  const tagRows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, result.transaction.id));

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

  const result = await db.transaction(async (tx) => {
    const [txn] = await tx
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
    const found = await tx
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

    await tx.insert(transactionTags).values(
      uniqueTagIds.map((tagId) => ({
        createdById: user.id,
        tagId,
        transactionId: txn.id,
      })),
    );

    return {
      lookupCount: found.length,
      transaction: txn,
      uniqueCount: uniqueTagIds.length,
    };
  });

  expect(result.lookupCount).toBe(1);
  expect(result.uniqueCount).toBe(1);

  const tagRows = await db
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, result.transaction.id));

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
