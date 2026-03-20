import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { importRows, imports } from '@/modules/imports/db/schema';
import { createImportService } from '@/modules/imports/services/create-import';
import { deleteImportService } from '@/modules/imports/services/delete-import';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertImport, insertImportRow } from '~test/factories/import.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

const SAMPLE_CSV = `Date,Description,Amount
2024-01-15,Coffee Shop,-4.50
2024-01-16,Paycheck,2500.00
2024-01-17,Groceries,-85.23`;

test('delete — hard-deletes import', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const imp = await insertImport(serviceDb, {
    accountId: account.id,
    userId: user.id,
  });

  await deleteImportService(asDb(serviceDb), user.id, { id: imp.id });

  const rows = await serviceDb
    .select()
    .from(imports)
    .where(eq(imports.id, imp.id));

  expect(rows).toHaveLength(0);
});

test('delete — cascades import rows', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const imp = await insertImport(serviceDb, {
    accountId: account.id,
    userId: user.id,
  });
  await insertImportRow(serviceDb, { importId: imp.id, rowIndex: 0 });
  await insertImportRow(serviceDb, { importId: imp.id, rowIndex: 1 });

  await deleteImportService(asDb(serviceDb), user.id, { id: imp.id });

  const rows = await serviceDb
    .select()
    .from(importRows)
    .where(eq(importRows.importId, imp.id));

  expect(rows).toHaveLength(0);
});

test('delete — rejects cross-user import', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const otherUser = await insertUser(serviceDb);
  const imp = await insertImport(serviceDb, {
    accountId: account.id,
    userId: user.id,
  });

  await expect(
    deleteImportService(asDb(serviceDb), otherUser.id, { id: imp.id }),
  ).rejects.toMatchObject({ status: 404 });
});

test('delete — rejects nonexistent import', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  await expect(
    deleteImportService(asDb(serviceDb), user.id, { id: fakeId() }),
  ).rejects.toMatchObject({ status: 404 });
});

test('delete — writes audit log entry', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const imp = await insertImport(serviceDb, {
    accountId: account.id,
    userId: user.id,
  });

  await deleteImportService(asDb(serviceDb), user.id, { id: imp.id });

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, imp.id),
        eq(auditLogs.tableName, 'imports'),
        eq(auditLogs.action, 'delete'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].actorId).toBe(user.id);
  expect(logs[0].beforeData).toMatchObject({
    accountId: account.id,
    id: imp.id,
  });
});

test('delete — allows re-upload of same file hash after hard delete', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);

  const result = await createImportService(asDb(serviceDb), user.id, {
    accountId: account.id,
    fileContent: SAMPLE_CSV,
    fileHash: 'reupload-hash',
    fileName: 'test.csv',
  });

  await deleteImportService(asDb(serviceDb), user.id, { id: result.id });

  const second = await createImportService(asDb(serviceDb), user.id, {
    accountId: account.id,
    fileContent: SAMPLE_CSV,
    fileHash: 'reupload-hash',
    fileName: 'test.csv',
  });

  expect(second.id).toBeDefined();
  expect(second.id).not.toBe(result.id);
});
