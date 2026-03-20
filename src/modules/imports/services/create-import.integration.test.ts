import { eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { importRows } from '@/modules/imports/db/schema';
import { createImportService } from '@/modules/imports/services/create-import';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertImport } from '~test/factories/import.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

const SAMPLE_CSV = `Date,Description,Amount
2024-01-15,Coffee Shop,-4.50
2024-01-16,Paycheck,2500.00
2024-01-17,Groceries,-85.23`;

function validInput(accountId: string, overrides?: Record<string, string>) {
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
  expect(result.status).toBe('pending');
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

  // Row 2 has an extra field — PapaParse reports an error but still parses rows
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
    .where(eq(importRows.importId, result.id));

  expect(persisted).toHaveLength(501);
  expect(persisted[0].rowIndex).toBe(0);
  expect(persisted[500].rowIndex).toBe(500);
});
