import { eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';
import type { ProcessedNormalizedRow } from '@/modules/imports/lib/apply-column-mapping';

import { auditLogs } from '@/db/schema';
import { importRows } from '@/modules/imports/db/schema';
import { computeRowFingerprint } from '@/modules/imports/lib/compute-row-fingerprint';
import { commitImportService } from '@/modules/imports/services/commit-import';
import { transactions } from '@/modules/transactions/db/schema';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import type { Db as TestDb } from '~test/factories/base';
import { insertCategory } from '~test/factories/category.factory';
import { insertImport, insertImportRow } from '~test/factories/import.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

async function createReadyImport(db: TestDb, rows: ProcessedNormalizedRow[]) {
  const { account, user } = await insertAccountWithUser(db);
  const imp = await insertImport(db, {
    accountId: account.id,
    status: 'completed',
    userId: user.id,
  });
  const importRowRecords = [];
  for (const [i, row_] of rows.entries()) {
    const row = await insertImportRow(db, {
      createdById: user.id,
      importId: imp.id,
      normalizedData: row_,
      rawData: { raw: 'data' },
      rowIndex: i,
      status: 'mapped',
    });
    importRowRecords.push(row);
  }
  return { account, import: imp, rows: importRowRecords, user };
}

test('commit — happy path: creates transactions from mapped rows', async ({
  serviceDb,
}) => {
  const { import: imp, user } = await createReadyImport(serviceDb, [
    {
      amountCents: -450,
      description: 'Coffee',
      fingerprint: computeRowFingerprint({
        amountCents: -450,
        description: 'Coffee',
        transactionAt: '2024-01-15',
      })!,
      transactionAt: '2024-01-15',
    },
    {
      amountCents: 250_000,
      description: 'Paycheck',
      fingerprint: computeRowFingerprint({
        amountCents: 250_000,
        description: 'Paycheck',
        transactionAt: '2024-01-16',
      })!,
      transactionAt: '2024-01-16',
    },
  ]);

  const result = await commitImportService(asDb(serviceDb), user.id, {
    importId: imp.id,
  });

  expect(result.committedCount).toBe(2);
  expect(result.errorCount).toBe(0);
  expect(result.skippedCount).toBe(0);

  const rows = await serviceDb
    .select()
    .from(importRows)
    .where(eq(importRows.importId, imp.id))
    .orderBy(importRows.rowIndex);

  expect(rows[0].status).toBe('committed');
  expect(rows[0].transactionId).toBeDefined();
  expect(rows[1].status).toBe('committed');
  expect(rows[1].transactionId).toBeDefined();

  const allTxns = await serviceDb.select().from(transactions);
  expect(allTxns).toHaveLength(2);
});

test('commit — amount sign conversion: negative=debit, positive=credit', async ({
  serviceDb,
}) => {
  const { import: imp, user } = await createReadyImport(serviceDb, [
    { amountCents: -450, description: 'Expense', transactionAt: '2024-01-15' },
    {
      amountCents: 250_000,
      description: 'Income',
      transactionAt: '2024-01-16',
    },
  ]);

  await commitImportService(asDb(serviceDb), user.id, { importId: imp.id });

  const updatedRows = await serviceDb
    .select()
    .from(importRows)
    .where(eq(importRows.importId, imp.id))
    .orderBy(importRows.rowIndex);

  const [debitTxn] = await serviceDb
    .select()
    .from(transactions)
    .where(eq(transactions.id, updatedRows[0].transactionId!));

  const [creditTxn] = await serviceDb
    .select()
    .from(transactions)
    .where(eq(transactions.id, updatedRows[1].transactionId!));

  expect(debitTxn.amountCents).toBe(450);
  expect(debitTxn.direction).toBe('debit');
  expect(creditTxn.amountCents).toBe(250_000);
  expect(creditTxn.direction).toBe('credit');
});

test('commit — skips non-mapped rows', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const imp = await insertImport(serviceDb, {
    accountId: account.id,
    status: 'completed',
    userId: user.id,
  });

  await insertImportRow(serviceDb, {
    createdById: user.id,
    importId: imp.id,
    normalizedData: {
      amountCents: -450,
      description: 'Mapped',
      transactionAt: '2024-01-15',
    },
    rawData: { raw: 'data' },
    rowIndex: 0,
    status: 'mapped',
  });
  await insertImportRow(serviceDb, {
    createdById: user.id,
    importId: imp.id,
    normalizedData: { errorReason: 'bad' },
    rawData: { raw: 'data' },
    rowIndex: 1,
    status: 'error',
  });
  await insertImportRow(serviceDb, {
    createdById: user.id,
    importId: imp.id,
    normalizedData: null,
    rawData: { raw: 'data' },
    rowIndex: 2,
    status: 'duplicate',
  });

  const result = await commitImportService(asDb(serviceDb), user.id, {
    importId: imp.id,
  });

  expect(result.committedCount).toBe(1);

  const allTxns = await serviceDb.select().from(transactions);
  expect(allTxns).toHaveLength(1);
});

test('commit — resolves payees by name', async ({ serviceDb }) => {
  const { import: imp, user } = await createReadyImport(serviceDb, [
    {
      amountCents: -450,
      description: 'Coffee',
      payeeName: 'Starbucks',
      transactionAt: '2024-01-15',
    },
    {
      amountCents: -300,
      description: 'More Coffee',
      payeeName: 'Starbucks',
      transactionAt: '2024-01-16',
    },
  ]);

  await commitImportService(asDb(serviceDb), user.id, { importId: imp.id });

  const allTxns = await serviceDb.select().from(transactions);
  expect(allTxns).toHaveLength(2);
  expect(allTxns[0].payeeId).toBeDefined();
  expect(allTxns[0].payeeId).toBe(allTxns[1].payeeId);
});

test('commit — resolves existing categories by name, null for unknown', async ({
  serviceDb,
}) => {
  const { import: imp, user } = await createReadyImport(serviceDb, [
    {
      amountCents: -450,
      categoryName: 'Food',
      description: 'Coffee',
      transactionAt: '2024-01-15',
    },
    {
      amountCents: -300,
      categoryName: 'Nonexistent',
      description: 'Other',
      transactionAt: '2024-01-16',
    },
  ]);

  await insertCategory(serviceDb, {
    name: 'Food',
    type: 'expense',
    userId: user.id,
  });

  await commitImportService(asDb(serviceDb), user.id, { importId: imp.id });

  const updatedRows = await serviceDb
    .select()
    .from(importRows)
    .where(eq(importRows.importId, imp.id))
    .orderBy(importRows.rowIndex);

  const [withCategory] = await serviceDb
    .select()
    .from(transactions)
    .where(eq(transactions.id, updatedRows[0].transactionId!));

  const [withoutCategory] = await serviceDb
    .select()
    .from(transactions)
    .where(eq(transactions.id, updatedRows[1].transactionId!));

  expect(withCategory.categoryId).toBeDefined();
  expect(withoutCategory.categoryId).toBeNull();
});

test('commit — rejects import not owned by user', async ({ serviceDb }) => {
  const { import: imp } = await createReadyImport(serviceDb, [
    { amountCents: -450, description: 'Coffee', transactionAt: '2024-01-15' },
  ]);

  const otherUser = await insertAccountWithUser(serviceDb);

  await expect(
    commitImportService(asDb(serviceDb), otherUser.user.id, {
      importId: imp.id,
    }),
  ).rejects.toThrow(/import not found/i);
});

test('commit — rejects import not in completed status', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const imp = await insertImport(serviceDb, {
    accountId: account.id,
    status: 'pending',
    userId: user.id,
  });

  await expect(
    commitImportService(asDb(serviceDb), user.id, { importId: imp.id }),
  ).rejects.toThrow(/cannot be committed/i);
});

test('commit — rejects re-commit of already committed import', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const imp = await insertImport(serviceDb, {
    accountId: account.id,
    status: 'committed',
    userId: user.id,
  });

  await expect(
    commitImportService(asDb(serviceDb), user.id, { importId: imp.id }),
  ).rejects.toThrow(/cannot be committed/i);
});

test('commit — fingerprint collision marks row as duplicate', async ({
  serviceDb,
}) => {
  const fp = computeRowFingerprint({
    amountCents: -450,
    description: 'Coffee',
    transactionAt: '2024-01-15',
  })!;

  const {
    account,
    import: imp,
    user,
  } = await createReadyImport(serviceDb, [
    {
      amountCents: -450,
      description: 'Coffee',
      fingerprint: fp,
      transactionAt: '2024-01-15',
    },
  ]);

  // Insert a transaction with the same fingerprint before committing
  await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 450,
    createdById: user.id,
    description: 'Coffee',
    fingerprint: fp,
    postedAt: new Date('2024-01-15'),
    transactionAt: new Date('2024-01-15'),
  });

  const result = await commitImportService(asDb(serviceDb), user.id, {
    importId: imp.id,
  });

  expect(result.committedCount).toBe(0);
  expect(result.skippedCount).toBe(1);

  const rows = await serviceDb
    .select()
    .from(importRows)
    .where(eq(importRows.importId, imp.id));

  expect(rows[0].status).toBe('duplicate');
});

test('commit — creates audit logs for transactions', async ({ serviceDb }) => {
  const { import: imp, user } = await createReadyImport(serviceDb, [
    { amountCents: -450, description: 'Coffee', transactionAt: '2024-01-15' },
  ]);

  await commitImportService(asDb(serviceDb), user.id, { importId: imp.id });

  const txnAudits = await serviceDb
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.tableName, 'transactions'));

  expect(txnAudits).toHaveLength(1);
  expect(txnAudits[0].action).toBe('create');

  const importAudits = await serviceDb
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.tableName, 'imports'));

  expect(importAudits.length).toBeGreaterThanOrEqual(1);
});

test('commit — no mapped rows throws 422', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const imp = await insertImport(serviceDb, {
    accountId: account.id,
    status: 'completed',
    userId: user.id,
  });

  await insertImportRow(serviceDb, {
    importId: imp.id,
    normalizedData: { errorReason: 'bad' },
    rawData: {},
    rowIndex: 0,
    status: 'error',
  });

  await expect(
    commitImportService(asDb(serviceDb), user.id, { importId: imp.id }),
  ).rejects.toThrow(/no rows to commit/i);
});
