import { eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';
import type { CreateImportInput } from '@/modules/imports/validators';

import { auditLogs } from '@/db/schema';
import { importRows } from '@/modules/imports/db/schema';
import { computeRowFingerprint } from '@/modules/imports/lib/compute-row-fingerprint';
import { createImportService } from '@/modules/imports/services/create-import';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertImport } from '~test/factories/import.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

const SAMPLE_CSV = `Date,Description,Amount
2024-01-15,Coffee Shop,-4.50
2024-01-16,Paycheck,2500.00
2024-01-17,Groceries,-85.23`;

function validInput(accountId: string, overrides?: Partial<CreateImportInput>) {
  return {
    accountId,
    fileContent: SAMPLE_CSV,
    fileHash: 'abc123hash',
    fileName: 'test.csv',
    ...overrides,
  };
}

test('create — happy path: inserts import + rows', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  const result = await createImportService(
    asDb(serviceDb),
    user.id,
    validInput(account.id),
  );

  expect(result.id).toBeDefined();
  expect(result.status).toBe('completed');
  expect(result.startedAt).toBeInstanceOf(Date);
  expect(result.finishedAt).toBeInstanceOf(Date);
  expect(result.finishedAt!.getTime()).toBeGreaterThanOrEqual(
    result.startedAt!.getTime(),
  );
  expect(result.source).toBe('csv');
  expect(result.fileName).toBe('test.csv');
  expect(result.fileHash).toBe('abc123hash');
  expect(result.accountId).toBe(account.id);
  expect(result.userId).toBe(user.id);
  expect(result.rowCount).toBe(3);

  const rows = await serviceDb
    .select()
    .from(importRows)
    .where(eq(importRows.importId, result.id));

  expect(rows).toHaveLength(3);
  expect(rows[0].rowIndex).toBe(0);
  expect(rows[0].rawData).toEqual({
    Amount: '-4.50',
    Date: '2024-01-15',
    Description: 'Coffee Shop',
  });
  expect(rows[2].rowIndex).toBe(2);
});

test('create — rejects if account not owned by user', async ({ serviceDb }) => {
  const { account } = await insertAccountWithUser(serviceDb);
  const otherUser = await insertUser(serviceDb);

  await expect(
    createImportService(asDb(serviceDb), otherUser.id, validInput(account.id)),
  ).rejects.toThrow(/account not found/i);
});

test('create — rejects non-existent account', async ({ serviceDb }) => {
  const { user } = await insertAccountWithUser(serviceDb);

  await expect(
    createImportService(asDb(serviceDb), user.id, validInput(fakeId())),
  ).rejects.toThrow(/account not found/i);
});

test('create — rejects duplicate file hash', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  await insertImport(serviceDb, {
    accountId: account.id,
    fileHash: 'duplicate-hash',
    userId: user.id,
  });

  await expect(
    createImportService(
      asDb(serviceDb),
      user.id,
      validInput(account.id, { fileHash: 'duplicate-hash' }),
    ),
  ).rejects.toThrow(/duplicate import/i);
});

test('create — rejects empty CSV', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  await expect(
    createImportService(
      asDb(serviceDb),
      user.id,
      validInput(account.id, { fileContent: 'Date,Description,Amount\n' }),
    ),
  ).rejects.toThrow(/no data rows/i);
});

test('create — rejects empty content', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  await expect(
    createImportService(
      asDb(serviceDb),
      user.id,
      validInput(account.id, { fileContent: '' }),
    ),
  ).rejects.toThrow(/failed to parse csv/i);
});

test('create — inserts audit log', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  const result = await createImportService(
    asDb(serviceDb),
    user.id,
    validInput(account.id),
  );

  const [audit] = await serviceDb
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.recordId, result.id));

  expect(audit).toBeDefined();
  expect(audit.action).toBe('create');
  expect(audit.tableName).toBe('imports');
  expect(audit.actorId).toBe(user.id);
  expect(audit.afterData).toMatchObject({ status: 'completed' });
  expect(audit.afterData).toHaveProperty('finishedAt');
});

test('create — different users can import same file hash', async ({
  serviceDb,
}) => {
  const { account: account1, user: user1 } =
    await insertAccountWithUser(serviceDb);
  const { account: account2, user: user2 } =
    await insertAccountWithUser(serviceDb);

  const input1 = validInput(account1.id, { fileHash: 'shared-hash' });
  const input2 = validInput(account2.id, { fileHash: 'shared-hash' });

  const result1 = await createImportService(asDb(serviceDb), user1.id, input1);
  const result2 = await createImportService(asDb(serviceDb), user2.id, input2);

  expect(result1.id).toBeDefined();
  expect(result2.id).toBeDefined();
  expect(result1.id).not.toBe(result2.id);
});

test('create — CSV with parse errors but valid rows succeeds', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  // Row 2 has an extra field — parser reports an error but still returns valid rows
  const csvWithErrors = `Date,Description,Amount
2024-01-15,Coffee Shop,-4.50
2024-01-16,Paycheck,2500.00,extrafield
2024-01-17,Groceries,-85.23`;

  const result = await createImportService(
    asDb(serviceDb),
    user.id,
    validInput(account.id, { fileContent: csvWithErrors, fileHash: 'partial' }),
  );

  expect(result.rowCount).toBe(3);
});

test('create — CSV with quoted fields parses correctly', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  const quotedCsv = `Date,Description,Amount
2024-01-15,"AMAZON.COM, INC.",-42.99
2024-01-16,"O'Reilly Auto Parts",-25.00`;

  const result = await createImportService(
    asDb(serviceDb),
    user.id,
    validInput(account.id, { fileContent: quotedCsv, fileHash: 'quoted' }),
  );

  expect(result.rowCount).toBe(2);

  const rows = await serviceDb
    .select()
    .from(importRows)
    .where(eq(importRows.importId, result.id));

  expect(rows[0].rawData).toEqual({
    Amount: '-42.99',
    Date: '2024-01-15',
    Description: 'AMAZON.COM, INC.',
  });
});

test('create — with columnMapping populates normalizedData on rows', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  const csv = `Date,Description,Amount,Category
2024-01-15,Coffee Shop,-4.50,Food
2024-01-16,Paycheck,2500.00,Income`;

  const result = await createImportService(
    asDb(serviceDb),
    user.id,
    validInput(account.id, {
      columnMapping: {
        amountMode: 'single',
        mapping: {
          Amount: 'amount',
          Category: 'categoryName',
          Date: 'transactionAt',
          Description: 'description',
        },
      },
      fileContent: csv,
      fileHash: 'mapping-test',
    }),
  );

  expect(result.columnMapping).toEqual({
    amountMode: 'single',
    mapping: {
      Amount: 'amount',
      Category: 'categoryName',
      Date: 'transactionAt',
      Description: 'description',
    },
  });

  const rows = await serviceDb
    .select()
    .from(importRows)
    .where(eq(importRows.importId, result.id));

  expect(rows[0].normalizedData).toMatchObject({
    amountCents: -450,
    categoryName: 'Food',
    description: 'Coffee Shop',
    transactionAt: '2024-01-15',
  });
  expect(rows[1].normalizedData).toMatchObject({
    amountCents: 250_000,
    categoryName: 'Income',
    description: 'Paycheck',
    transactionAt: '2024-01-16',
  });
});

test('create — with split debit/credit columnMapping normalizes correctly', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  const csv = `Date,Description,Debit,Credit
2024-01-15,Purchase,50.00,
2024-01-16,Deposit,,2500.00`;

  const result = await createImportService(
    asDb(serviceDb),
    user.id,
    validInput(account.id, {
      columnMapping: {
        amountMode: 'split',
        mapping: {
          Credit: 'creditAmount',
          Date: 'transactionAt',
          Debit: 'debitAmount',
          Description: 'description',
        },
      },
      fileContent: csv,
      fileHash: 'split-mapping-test',
    }),
  );

  const rows = await serviceDb
    .select()
    .from(importRows)
    .where(eq(importRows.importId, result.id));

  expect(rows[0].normalizedData).toMatchObject({
    amountCents: -5000,
    description: 'Purchase',
    transactionAt: '2024-01-15',
  });
  expect(rows[1].normalizedData).toMatchObject({
    amountCents: 250_000,
    description: 'Deposit',
    transactionAt: '2024-01-16',
  });
});

test('create — without columnMapping leaves normalizedData null', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  const result = await createImportService(
    asDb(serviceDb),
    user.id,
    validInput(account.id, { fileHash: 'no-mapping-test' }),
  );

  const rows = await serviceDb
    .select()
    .from(importRows)
    .where(eq(importRows.importId, result.id));

  expect(rows[0].normalizedData).toBeNull();
});

test('create — batched insert persists all rows across batch boundaries', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  // Generate CSV with 501 rows to cross one batch boundary (BATCH_SIZE = 500)
  const header = 'Date,Description,Amount';
  const rows = Array.from(
    { length: 501 },
    (_, i) => `2024-01-01,Row ${i},-${(i + 1).toFixed(2)}`,
  );
  const largeCsv = [header, ...rows].join('\n');

  const result = await createImportService(
    asDb(serviceDb),
    user.id,
    validInput(account.id, { fileContent: largeCsv, fileHash: 'batch-test' }),
  );

  expect(result.rowCount).toBe(501);

  const persisted = await serviceDb
    .select()
    .from(importRows)
    .where(eq(importRows.importId, result.id))
    .orderBy(importRows.rowIndex);

  expect(persisted).toHaveLength(501);
  expect(persisted[0].rowIndex).toBe(0);
  expect(persisted[500].rowIndex).toBe(500);
});

// --- Validation + dedupe tests ---

const MAPPED_COLUMN_MAPPING = {
  amountMode: 'single' as const,
  mapping: {
    Amount: 'amount' as const,
    Date: 'transactionAt' as const,
    Description: 'description' as const,
  },
};

test('create — row with missing description gets status=error', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  const csv = `Date,Description,Amount
2024-01-15,Coffee,-4.50
2024-01-16,,-10.00`;

  const result = await createImportService(
    asDb(serviceDb),
    user.id,
    validInput(account.id, {
      columnMapping: MAPPED_COLUMN_MAPPING,
      fileContent: csv,
      fileHash: 'missing-desc',
    }),
  );

  const rows = await serviceDb
    .select()
    .from(importRows)
    .where(eq(importRows.importId, result.id))
    .orderBy(importRows.rowIndex);

  expect(rows[0].status).toBe('mapped');
  expect(rows[1].status).toBe('error');
  expect(
    (rows[1].normalizedData as Record<string, unknown>).errorReason,
  ).toMatch(/description/i);
});

test('create — row with non-numeric amount gets status=error', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  const csv = `Date,Description,Amount
2024-01-15,Coffee,N/A`;

  const result = await createImportService(
    asDb(serviceDb),
    user.id,
    validInput(account.id, {
      columnMapping: MAPPED_COLUMN_MAPPING,
      fileContent: csv,
      fileHash: 'bad-amount',
    }),
  );

  const rows = await serviceDb
    .select()
    .from(importRows)
    .where(eq(importRows.importId, result.id));

  expect(rows[0].status).toBe('error');
  expect(
    (rows[0].normalizedData as Record<string, unknown>).errorReason,
  ).toMatch(/parse amount.*N\/A/i);
});

test('create — two identical rows: second is duplicate', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  const csv = `Date,Description,Amount
2024-01-15,Coffee,-4.50
2024-01-15,Coffee,-4.50`;

  const result = await createImportService(
    asDb(serviceDb),
    user.id,
    validInput(account.id, {
      columnMapping: MAPPED_COLUMN_MAPPING,
      fileContent: csv,
      fileHash: 'intra-dupe',
    }),
  );

  const rows = await serviceDb
    .select()
    .from(importRows)
    .where(eq(importRows.importId, result.id))
    .orderBy(importRows.rowIndex);

  expect(rows[0].status).toBe('mapped');
  expect(rows[1].status).toBe('duplicate');
});

test('create — row matching existing transaction fingerprint is duplicate', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  const fp = computeRowFingerprint({
    amountCents: -450,
    description: 'Coffee',
    transactionAt: '2024-01-15',
  });

  await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 450,
    createdById: user.id,
    description: 'Coffee',
    fingerprint: fp,
    postedAt: new Date('2024-01-15'),
    transactionAt: new Date('2024-01-15'),
  });

  const csv = `Date,Description,Amount
2024-01-15,Coffee,-4.50`;

  const result = await createImportService(
    asDb(serviceDb),
    user.id,
    validInput(account.id, {
      columnMapping: MAPPED_COLUMN_MAPPING,
      fileContent: csv,
      fileHash: 'db-dupe',
    }),
  );

  const rows = await serviceDb
    .select()
    .from(importRows)
    .where(eq(importRows.importId, result.id));

  expect(rows[0].status).toBe('duplicate');
});

test('create — mixed valid, error, and duplicate rows', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  const csv = `Date,Description,Amount
2024-01-15,Coffee,-4.50
2024-01-16,,-10.00
2024-01-17,Groceries,N/A
2024-01-15,Coffee,-4.50`;

  const result = await createImportService(
    asDb(serviceDb),
    user.id,
    validInput(account.id, {
      columnMapping: MAPPED_COLUMN_MAPPING,
      fileContent: csv,
      fileHash: 'mixed',
    }),
  );

  expect(result.status).toBe('completed');
  expect(result.rowCount).toBe(4);
  expect(result.mappedCount).toBe(1);
  expect(result.errorCount).toBe(2);
  expect(result.duplicateCount).toBe(1);
});

test('create — without columnMapping rows stay status=mapped', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  const result = await createImportService(
    asDb(serviceDb),
    user.id,
    validInput(account.id, { fileHash: 'no-mapping-status' }),
  );

  const rows = await serviceDb
    .select()
    .from(importRows)
    .where(eq(importRows.importId, result.id));

  for (const row of rows) {
    expect(row.status).toBe('mapped');
  }
});
